namespace Sdlc.Api;

public static class ContentGate
{
    public static int Check(string repositoryRoot, TextWriter log)
    {
        var issues = ContentValidator.Validate(repositoryRoot);
        if (issues.Count == 0)
        {
            return 0;
        }

        foreach (var issue in issues)
        {
            log.WriteLine(issue.Path + ": " + issue.Reason);
        }

        return 1;
    }
}
