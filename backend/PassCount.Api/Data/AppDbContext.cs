using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PassCount.Api.Entities;

namespace PassCount.Api.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<CounterEntity> Counters => Set<CounterEntity>();
    public DbSet<LogEntryEntity> Logs => Set<LogEntryEntity>();
    public DbSet<TrainingEntity> Trainings => Set<TrainingEntity>();
    public DbSet<EquipmentListEntity> EquipmentLists => Set<EquipmentListEntity>();
    public DbSet<EquipmentItemEntity> EquipmentItems => Set<EquipmentItemEntity>();
    public DbSet<UserSettingsEntity> UserSettings => Set<UserSettingsEntity>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<RefreshToken>(e =>
        {
            e.HasIndex(r => r.TokenHash).IsUnique();
            e.HasIndex(r => r.UserId);
            e.Property(r => r.TokenHash).HasMaxLength(128);
        });

        builder.Entity<CounterEntity>(e =>
        {
            e.HasKey(c => c.Id);
            e.HasIndex(c => c.UserId);
            e.Property(c => c.Name).HasMaxLength(100).IsRequired();
            e.Property(c => c.Color).HasMaxLength(20).IsRequired();
        });

        builder.Entity<LogEntryEntity>(e =>
        {
            e.HasKey(l => l.Id);
            e.HasIndex(l => l.UserId);
            e.Property(l => l.CounterName).HasMaxLength(100);
            e.Property(l => l.Type).HasMaxLength(20).IsRequired();
        });

        builder.Entity<TrainingEntity>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasIndex(t => t.UserId);
            e.Property(t => t.Name).HasMaxLength(100).IsRequired();
            e.Property(t => t.Color).HasMaxLength(20).IsRequired();
            e.Property(t => t.DaysCsv).HasMaxLength(40);
        });

        builder.Entity<EquipmentListEntity>(e =>
        {
            e.HasKey(l => l.Id);
            e.HasIndex(l => l.UserId);
            e.Property(l => l.Name).HasMaxLength(100).IsRequired();
            e.Property(l => l.Color).HasMaxLength(20).IsRequired();
            e.HasMany(l => l.Items)
                .WithOne()
                .HasForeignKey(i => i.EquipmentListId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<EquipmentItemEntity>(e =>
        {
            e.HasKey(i => i.Id);
            e.HasIndex(i => i.EquipmentListId);
            e.Property(i => i.Name).HasMaxLength(100).IsRequired();
        });

        builder.Entity<UserSettingsEntity>(e =>
        {
            e.HasKey(s => s.UserId);
            e.Property(s => s.SortOrder).HasMaxLength(20);
        });
    }
}
