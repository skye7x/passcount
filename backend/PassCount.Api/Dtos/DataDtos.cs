using System.ComponentModel.DataAnnotations;

namespace PassCount.Api.Dtos;

public class CounterDto
{
    [Required, MaxLength(64)]
    public string Id { get; set; } = default!;

    [Required, MaxLength(100)]
    public string Name { get; set; } = default!;

    public int Total { get; set; }
    public int Remaining { get; set; }

    [Required, MaxLength(20)]
    public string Color { get; set; } = default!;

    public long CreatedAt { get; set; }
    public long? ExpiresAt { get; set; }
}

public class LogEntryDto
{
    [Required, MaxLength(64)]
    public string Id { get; set; } = default!;

    [Required, MaxLength(64)]
    public string CounterId { get; set; } = default!;

    [MaxLength(100)]
    public string CounterName { get; set; } = string.Empty;

    public long Timestamp { get; set; }

    [Required, MaxLength(20)]
    public string Type { get; set; } = default!;
}

public class TrainingDto
{
    [Required, MaxLength(64)]
    public string Id { get; set; } = default!;

    [Required, MaxLength(100)]
    public string Name { get; set; } = default!;

    public List<int> Days { get; set; } = new();
    public int Hour { get; set; }
    public int Minute { get; set; }
    public bool Enabled { get; set; }

    [Required, MaxLength(20)]
    public string Color { get; set; } = default!;
}

public class EquipmentItemDto
{
    [Required, MaxLength(64)]
    public string Id { get; set; } = default!;

    [Required, MaxLength(100)]
    public string Name { get; set; } = default!;

    public bool Packed { get; set; }
}

public class EquipmentListDto
{
    [Required, MaxLength(64)]
    public string Id { get; set; } = default!;

    [Required, MaxLength(100)]
    public string Name { get; set; } = default!;

    [Required, MaxLength(20)]
    public string Color { get; set; } = default!;

    public List<EquipmentItemDto> Items { get; set; } = new();
    public bool Packed { get; set; }
    public long? PackedAt { get; set; }
    public long CreatedAt { get; set; }
}

public class AppSettingsDto
{
    public bool HapticFeedback { get; set; } = true;
    public bool ConfirmDelete { get; set; } = true;

    [Required, MaxLength(20)]
    public string SortOrder { get; set; } = "newest";

    public bool NotificationsEnabled { get; set; }
}

public class SyncDataDto
{
    public List<CounterDto> Counters { get; set; } = new();
    public List<LogEntryDto> Logs { get; set; } = new();
    public List<TrainingDto> Trainings { get; set; } = new();
    public List<EquipmentListDto> Equipment { get; set; } = new();
    public AppSettingsDto Settings { get; set; } = new();
}
