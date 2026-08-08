namespace PassCount.Api.Entities;

public class LogEntryEntity
{
    public string Id { get; set; } = default!;
    public string UserId { get; set; } = default!;
    public string CounterId { get; set; } = default!;
    public string CounterName { get; set; } = default!;
    public long Timestamp { get; set; }
    public string Type { get; set; } = default!; // 'decrement' | 'reset' | 'edit' | 'create'
}
