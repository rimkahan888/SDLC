using System.Text.Json;
using System.Text.Json.Serialization;

namespace Sdlc.Api;

public partial class Program
{
    public static int Main(string[] args) => Execute(args, Console.Error);

    public static int Execute(string[] args, TextWriter log)
    {
        if (args.Length > 0 && string.Equals(args[0], "export", StringComparison.Ordinal))
        {
            if (args.Length != 2 || string.IsNullOrWhiteSpace(args[1]))
            {
                log.WriteLine("Usage: dotnet run --project api -- export <output-directory>");
                return 1;
            }

            var root = RepositoryRoot.Locate(Directory.GetCurrentDirectory(), AppContext.BaseDirectory);
            if (root is null)
            {
                log.WriteLine("Repository root does not exist.");
                return 1;
            }

            // dotnet run uses the project directory as the working directory, so a
            // relative path is from the repository root. The documented command is
            // `dotnet run --project api -- export web/public/data`.
            var output = args[1];
            if (!Path.IsPathRooted(output))
            {
                output = Path.GetFullPath(Path.Combine(root, output));
            }

            return ContentExport.Run(root, output, log);
        }

        return RunServer(args, log);
    }

    private static int RunServer(string[] args, TextWriter log)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        });

        builder.Services.AddHealthChecks();

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("dev", policy =>
            {
                policy.WithOrigins("http://localhost:5173");
            });
        });

        var root = RepositoryRoot.Locate(
            builder.Environment.ContentRootPath,
            Directory.GetCurrentDirectory(),
            AppContext.BaseDirectory);
        if (root is null)
        {
            log.WriteLine("Repository root does not exist.");
            return 1;
        }

        if (ContentGate.Check(root, log) != 0)
        {
            return 1;
        }

        ContentCatalog catalog;
        try
        {
            catalog = ContentCatalog.Load(root);
        }
        catch (Exception exception) when (exception is IOException or InvalidOperationException or JsonException)
        {
            log.WriteLine(root + ": " + exception.Message);
            return 1;
        }

        builder.Services.AddSingleton(catalog);

        var app = builder.Build();

        if (app.Environment.IsDevelopment())
        {
            app.UseCors("dev");
        }

        app.MapHealthChecks("/health");
        ContentEndpoints.Map(app);
        app.Run();
        return 0;
    }
}
