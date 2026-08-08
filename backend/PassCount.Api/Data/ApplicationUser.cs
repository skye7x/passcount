using Microsoft.AspNetCore.Identity;

namespace PassCount.Api.Data;

// Extends the default Identity user. Id (string, a GUID by default) is used
// as the foreign key on every piece of the user's data.
public class ApplicationUser : IdentityUser
{
}
