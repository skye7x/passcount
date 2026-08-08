using System.ComponentModel.DataAnnotations;

namespace PassCount.Api.Dtos;

public class RegisterRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = default!;

    [Required, MinLength(8), MaxLength(128)]
    public string Password { get; set; } = default!;
}

public class LoginRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = default!;

    [Required, MaxLength(128)]
    public string Password { get; set; } = default!;
}

public class RefreshRequest
{
    [Required]
    public string RefreshToken { get; set; } = default!;
}

public class LogoutRequest
{
    [Required]
    public string RefreshToken { get; set; } = default!;
}

public class AuthResponse
{
    public string Email { get; set; } = default!;
    public string AccessToken { get; set; } = default!;
    public int ExpiresInSeconds { get; set; }
    public string RefreshToken { get; set; } = default!;
}
