namespace PassCount.Api.Entities;

public class EquipmentListEntity
{
    public string Id { get; set; } = default!;
    public string UserId { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string Color { get; set; } = default!;
    public bool Packed { get; set; }
    public long? PackedAt { get; set; }
    public long CreatedAt { get; set; }

    public List<EquipmentItemEntity> Items { get; set; } = new();
}

public class EquipmentItemEntity
{
    public string Id { get; set; } = default!;
    public string EquipmentListId { get; set; } = default!;
    public string Name { get; set; } = default!;
    public bool Packed { get; set; }
}
