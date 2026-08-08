namespace PassCount.Api.Data;

// We never store the raw refresh token — only a SHA-256 hash of it — so a
// database leak alone can't be used to impersonate users.
public class RefreshToken
{
    public int Id { get; set; }
    public string UserId { get; set; } = default!;
    public string TokenHash { get; set; } = default!;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }

    public bool IsActive => RevokedAt == null && DateTime.UtcNow < ExpiresAt;
}
