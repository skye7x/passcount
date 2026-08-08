using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using PassCount.Api.Data;

namespace PassCount.Api.Services;

public class TokenResult
{
    public string AccessToken { get; set; } = default!;
    public int ExpiresInSeconds { get; set; }
    public string RefreshToken { get; set; } = default!; // plaintext, returned to client once
    public string RefreshTokenHash { get; set; } = default!; // stored server-side
    public DateTime RefreshTokenExpiresAt { get; set; }
}

public interface ITokenService
{
    TokenResult CreateTokens(ApplicationUser user);
    string HashRefreshToken(string refreshToken);
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;
    private const int AccessTokenMinutes = 30;
    private const int RefreshTokenDays = 30;

    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    public TokenResult CreateTokens(ApplicationUser user)
    {
        var jwtKey = _config["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is not configured.");
        var issuer = _config["Jwt:Issuer"] ?? "PassCountApi";
        var audience = _config["Jwt:Audience"] ?? "PassCountClient";

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddMinutes(AccessTokenMinutes);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        var refreshToken = GenerateRefreshTokenPlainText();

        return new TokenResult
        {
            AccessToken = accessToken,
            ExpiresInSeconds = AccessTokenMinutes * 60,
            RefreshToken = refreshToken,
            RefreshTokenHash = HashRefreshToken(refreshToken),
            RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenDays),
        };
    }

    public string HashRefreshToken(string refreshToken)
    {
        var bytes = Encoding.UTF8.GetBytes(refreshToken);
        var hash = SHA256.HashData(bytes);
        return Convert.ToBase64String(hash);
    }

    private static string GenerateRefreshTokenPlainText()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");
    }
}
