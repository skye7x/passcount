using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PassCount.Api.Data;
using PassCount.Api.Dtos;
using PassCount.Api.Entities;

namespace PassCount.Api.Controllers;

[ApiController]
[Route("api/data")]
[Authorize]
public class DataController : ControllerBase
{
    private readonly AppDbContext _db;

    // Sane upper bounds so a single sync payload can't be used to exhaust
    // storage or CPU. Generous enough for real usage.
    private const int MaxCounters = 500;
    private const int MaxLogs = 2000;
    private const int MaxTrainings = 200;
    private const int MaxEquipmentLists = 200;
    private const int MaxItemsPerList = 200;

    public DataController(AppDbContext db)
    {
        _db = db;
    }

    private string CurrentUserId =>
        User.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? throw new InvalidOperationException("Missing sub claim on authenticated request.");

    [HttpGet]
    public async Task<ActionResult<SyncDataDto>> Get()
    {
        var userId = CurrentUserId;

        var counters = await _db.Counters.Where(c => c.UserId == userId).ToListAsync();
        var logs = await _db.Logs.Where(l => l.UserId == userId)
            .OrderByDescending(l => l.Timestamp)
            .Take(MaxLogs)
            .ToListAsync();
        var trainings = await _db.Trainings.Where(t => t.UserId == userId).ToListAsync();
        var equipment = await _db.EquipmentLists.Where(e => e.UserId == userId)
            .Include(e => e.Items)
            .ToListAsync();
        var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);

        var dto = new SyncDataDto
        {
            Counters = counters.Select(ToDto).ToList(),
            Logs = logs.Select(ToDto).ToList(),
            Trainings = trainings.Select(ToDto).ToList(),
            Equipment = equipment.Select(ToDto).ToList(),
            Settings = settings == null ? new AppSettingsDto() : ToDto(settings),
        };

        return Ok(dto);
    }

    [HttpPut]
    public async Task<IActionResult> Put(SyncDataDto payload)
    {
        if (payload.Counters.Count > MaxCounters)
            return BadRequest(new { message = $"Too many counters (max {MaxCounters})." });
        if (payload.Logs.Count > MaxLogs)
            return BadRequest(new { message = $"Too many log entries (max {MaxLogs})." });
        if (payload.Trainings.Count > MaxTrainings)
            return BadRequest(new { message = $"Too many trainings (max {MaxTrainings})." });
        if (payload.Equipment.Count > MaxEquipmentLists)
            return BadRequest(new { message = $"Too many equipment lists (max {MaxEquipmentLists})." });
        if (payload.Equipment.Any(l => l.Items.Count > MaxItemsPerList))
            return BadRequest(new { message = $"An equipment list has too many items (max {MaxItemsPerList})." });

        var userId = CurrentUserId;

        await using var transaction = await _db.Database.BeginTransactionAsync();

        // Full-replace strategy: the client always sends its complete local
        // dataset, so we drop everything for this user and re-insert what was
        // sent. This keeps the merge logic simple and correct — the conflict
        // between "device data" and "cloud data" is resolved client-side
        // before this endpoint is ever called with the chosen dataset.
        await _db.Counters.Where(c => c.UserId == userId).ExecuteDeleteAsync();
        await _db.Logs.Where(l => l.UserId == userId).ExecuteDeleteAsync();
        await _db.Trainings.Where(t => t.UserId == userId).ExecuteDeleteAsync();

        var existingListIds = await _db.EquipmentLists
            .Where(e => e.UserId == userId)
            .Select(e => e.Id)
            .ToListAsync();
        if (existingListIds.Count > 0)
        {
            await _db.EquipmentItems.Where(i => existingListIds.Contains(i.EquipmentListId)).ExecuteDeleteAsync();
            await _db.EquipmentLists.Where(e => e.UserId == userId).ExecuteDeleteAsync();
        }

        _db.Counters.AddRange(payload.Counters.Select(c => FromDto(c, userId)));
        _db.Logs.AddRange(payload.Logs.Select(l => FromDto(l, userId)));
        _db.Trainings.AddRange(payload.Trainings.Select(t => FromDto(t, userId)));
        _db.EquipmentLists.AddRange(payload.Equipment.Select(e => FromDto(e, userId)));

        var settings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        if (settings == null)
        {
            _db.UserSettings.Add(FromDto(payload.Settings, userId));
        }
        else
        {
            settings.HapticFeedback = payload.Settings.HapticFeedback;
            settings.ConfirmDelete = payload.Settings.ConfirmDelete;
            settings.SortOrder = payload.Settings.SortOrder;
            settings.NotificationsEnabled = payload.Settings.NotificationsEnabled;
        }

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return NoContent();
    }

    // ---------- Mapping ----------

    private static CounterDto ToDto(CounterEntity c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Total = c.Total,
        Remaining = c.Remaining,
        Color = c.Color,
        CreatedAt = c.CreatedAt,
        ExpiresAt = c.ExpiresAt,
    };

    private static CounterEntity FromDto(CounterDto c, string userId) => new()
    {
        Id = c.Id,
        UserId = userId,
        Name = c.Name,
        Total = c.Total,
        Remaining = c.Remaining,
        Color = c.Color,
        CreatedAt = c.CreatedAt,
        ExpiresAt = c.ExpiresAt,
    };

    private static LogEntryDto ToDto(LogEntryEntity l) => new()
    {
        Id = l.Id,
        CounterId = l.CounterId,
        CounterName = l.CounterName,
        Timestamp = l.Timestamp,
        Type = l.Type,
    };

    private static LogEntryEntity FromDto(LogEntryDto l, string userId) => new()
    {
        Id = l.Id,
        UserId = userId,
        CounterId = l.CounterId,
        CounterName = l.CounterName,
        Timestamp = l.Timestamp,
        Type = l.Type,
    };

    private static TrainingDto ToDto(TrainingEntity t) => new()
    {
        Id = t.Id,
        Name = t.Name,
        Days = ParseDays(t.DaysCsv),
        Hour = t.Hour,
        Minute = t.Minute,
        Enabled = t.Enabled,
        Color = t.Color,
    };

    private static TrainingEntity FromDto(TrainingDto t, string userId) => new()
    {
        Id = t.Id,
        UserId = userId,
        Name = t.Name,
        DaysCsv = string.Join(',', t.Days),
        Hour = t.Hour,
        Minute = t.Minute,
        Enabled = t.Enabled,
        Color = t.Color,
    };

    private static List<int> ParseDays(string csv) =>
        string.IsNullOrWhiteSpace(csv)
            ? new List<int>()
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => int.TryParse(s, out var v) ? v : (int?)null)
                .Where(v => v.HasValue)
                .Select(v => v!.Value)
                .ToList();

    private static EquipmentListDto ToDto(EquipmentListEntity e) => new()
    {
        Id = e.Id,
        Name = e.Name,
        Color = e.Color,
        Packed = e.Packed,
        PackedAt = e.PackedAt,
        CreatedAt = e.CreatedAt,
        Items = e.Items.Select(i => new EquipmentItemDto
        {
            Id = i.Id,
            Name = i.Name,
            Packed = i.Packed,
        }).ToList(),
    };

    private static EquipmentListEntity FromDto(EquipmentListDto e, string userId) => new()
    {
        Id = e.Id,
        UserId = userId,
        Name = e.Name,
        Color = e.Color,
        Packed = e.Packed,
        PackedAt = e.PackedAt,
        CreatedAt = e.CreatedAt,
        Items = e.Items.Select(i => new EquipmentItemEntity
        {
            Id = i.Id,
            EquipmentListId = e.Id,
            Name = i.Name,
            Packed = i.Packed,
        }).ToList(),
    };

    private static AppSettingsDto ToDto(UserSettingsEntity s) => new()
    {
        HapticFeedback = s.HapticFeedback,
        ConfirmDelete = s.ConfirmDelete,
        SortOrder = s.SortOrder,
        NotificationsEnabled = s.NotificationsEnabled,
    };

    private static UserSettingsEntity FromDto(AppSettingsDto s, string userId) => new()
    {
        UserId = userId,
        HapticFeedback = s.HapticFeedback,
        ConfirmDelete = s.ConfirmDelete,
        SortOrder = s.SortOrder,
        NotificationsEnabled = s.NotificationsEnabled,
    };
}
