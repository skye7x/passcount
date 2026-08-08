namespace PassCount.Api.Entities;

public class UserSettingsEntity
{
    public string UserId { get; set; } = default!;
    public bool HapticFeedback { get; set; } = true;
    public bool ConfirmDelete { get; set; } = true;
    public string SortOrder { get; set; } = "newest"; // 'newest' | 'oldest' | 'name' | 'remaining'
    public bool NotificationsEnabled { get; set; }
}
