namespace Sdlc.Api;

public static class RepositoryRoot
{
    public static string? Locate(params string?[] starts)
    {
        foreach (var start in starts)
        {
            var found = Walk(start);
            if (found is not null)
            {
                return found;
            }
        }

        return null;
    }

    private static string? Walk(string? start)
    {
        if (string.IsNullOrWhiteSpace(start))
        {
            return null;
        }

        DirectoryInfo? dir;
        try
        {
            dir = new DirectoryInfo(Path.GetFullPath(start));
        }
        catch (Exception exception) when (exception is ArgumentException or PathTooLongException or NotSupportedException)
        {
            return null;
        }

        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "SDLC.sln")) &&
                Directory.Exists(Path.Combine(dir.FullName, "content", "stages")) &&
                Directory.Exists(Path.Combine(dir.FullName, "templates")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        return null;
    }
}
