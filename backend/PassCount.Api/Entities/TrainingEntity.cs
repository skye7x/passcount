namespace PassCount.Api.Entities;

public class TrainingEntity
{
    public string Id { get; set; } = default!;
    public string UserId { get; set; } = default!;
    public string Name { get; set; } = default!;

    // Stored as comma-separated ints (e.g. "1,3,5") — simplest portable
    // representation across SQL Server and SQLite without a separate table.
    public string DaysCsv { get; set; } = string.Empty;

    public int Hour { get; set; }
    public int Minute { get; set; }
    public bool Enabled { get; set; }
    public string Color { get; set; } = default!;
}
