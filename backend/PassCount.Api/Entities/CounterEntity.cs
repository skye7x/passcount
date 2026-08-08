namespace PassCount.Api.Entities;

public class CounterEntity
{
    public string Id { get; set; } = default!;
    public string UserId { get; set; } = default!;
    public string Name { get; set; } = default!;
    public int Total { get; set; }
    public int Remaining { get; set; }
    public string Color { get; set; } = default!;
    public long CreatedAt { get; set; }
    public long? ExpiresAt { get; set; }
}
