using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PassCount.Api.Data;
using PassCount.Api.Dtos;
using PassCount.Api.Entities;
using PassCount.Api.Services;

namespace PassCount.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        AppDbContext db,
        ITokenService tokenService,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _db = db;
        _tokenService = tokenService;
        _logger = logger;
    }

    private const string GenericLoginError = "Invalid email or password.";

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing != null)
        {
            // Same message either way avoids leaking which emails are registered.
            return BadRequest(new { message = "Could not create account with these details." });
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true, // No email-sending infra wired up yet; see README.
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var message = result.Errors.FirstOrDefault()?.Description ?? "Could not create account.";
            return BadRequest(new { message });
        }

        _db.UserSettings.Add(new UserSettingsEntity { UserId = user.Id });
        await _db.SaveChangesAsync();

        var response = await IssueTokensAsync(user);
        return Ok(response);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return Unauthorized(new { message = GenericLoginError });
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            if (result.IsLockedOut)
            {
                _logger.LogWarning("Login blocked: account locked for user {UserId}", user.Id);
            }
            return Unauthorized(new { message = GenericLoginError });
        }

        var response = await IssueTokensAsync(user);
        return Ok(response);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request)
    {
        var hash = _tokenService.HashRefreshToken(request.RefreshToken);
        var existing = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);

        if (existing == null)
        {
            return Unauthorized(new { message = "Session expired. Please sign in again." });
        }

        if (existing.RevokedAt != null)
        {
            // A previously-rotated-out token was reused: possible token theft.
            // Revoke every active session for this user as a precaution.
            _logger.LogWarning("Refresh token reuse detected for user {UserId}", existing.UserId);
            var allActive = await _db.RefreshTokens
                .Where(t => t.UserId == existing.UserId && t.RevokedAt == null)
                .ToListAsync();
            foreach (var t in allActive) t.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Unauthorized(new { message = "Session expired. Please sign in again." });
        }

        if (existing.ExpiresAt < DateTime.UtcNow)
        {
            return Unauthorized(new { message = "Session expired. Please sign in again." });
        }

        var user = await _userManager.FindByIdAsync(existing.UserId);
        if (user == null)
        {
            return Unauthorized(new { message = "Session expired. Please sign in again." });
        }

        existing.RevokedAt = DateTime.UtcNow;
        var response = await IssueTokensAsync(user);
        return Ok(response);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(LogoutRequest request)
    {
        var hash = _tokenService.HashRefreshToken(request.RefreshToken);
        var existing = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash);
        if (existing != null && existing.RevokedAt == null)
        {
            existing.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
        return NoContent();
    }

    private async Task<AuthResponse> IssueTokensAsync(ApplicationUser user)
    {
        var tokens = _tokenService.CreateTokens(user);

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokens.RefreshTokenHash,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = tokens.RefreshTokenExpiresAt,
        });
        await _db.SaveChangesAsync();

        return new AuthResponse
        {
            Email = user.Email ?? string.Empty,
            AccessToken = tokens.AccessToken,
            ExpiresInSeconds = tokens.ExpiresInSeconds,
            RefreshToken = tokens.RefreshToken,
        };
    }
}
