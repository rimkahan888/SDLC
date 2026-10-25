using System.Text.Json;

namespace Sdlc.Api;

public static class ContentExport
{
    public static int Run(string repositoryRoot, string outputDirectory, TextWriter log)
    {
        if (ContentGate.Check(repositoryRoot, log) != 0)
        {
            return 1;
        }

        try
        {
            var catalog = ContentCatalog.Load(repositoryRoot);
            catalog.Write(outputDirectory);
            return 0;
        }
        catch (Exception exception) when (exception is IOException or InvalidOperationException or JsonException)
        {
            log.WriteLine(repositoryRoot + ": " + exception.Message);
            return 1;
        }
    }
}
