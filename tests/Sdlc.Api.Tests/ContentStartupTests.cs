using System.Text.Json;
using System.Text.Json.Nodes;
using Sdlc.Api;

namespace Sdlc.Api.Tests;

public class ContentStartupTests
{
    [Fact]
    public void RealRepository_PassesTheStartupGate()
    {
        var log = new StringWriter();
        var code = ContentGate.Check(Repo(), log);
        Assert.Equal(0, code);
        Assert.Equal("", log.ToString());
    }

    [Fact]
    public void MissingRepository_FailsTheStartupGate()
    {
        var log = new StringWriter();
        var missing = Path.Combine(Path.GetTempPath(), "sdlc-missing-" + Guid.NewGuid().ToString("N"));
        var code = ContentGate.Check(missing, log);
        Assert.Equal(1, code);
        Assert.Contains(missing + ": Repository root does not exist.", log.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void MissingStage_FailsTheStartupGate()
    {
        WithCopy(root =>
        {
            File.Delete(Path.Combine(root, "content", "stages", "test.json"));
            AssertFails(root, "content/stages/test.json: Required stage 'test' is missing.");
        });
    }

    [Fact]
    public void DuplicateStageId_FailsTheStartupGate()
    {
        WithCopy(root =>
        {
            Mutate(root, "content/stages/design.json", stage => stage["id"] = "plan");
            AssertFails(root, "Stage id 'plan' is duplicated.");
        });
    }

    [Fact]
    public void UnknownStyle_FailsTheStartupGate()
    {
        WithCopy(root =>
        {
            Mutate(root, "content/stages/design.json", stage =>
            {
                var visual = Group(stage, "visual-style");
                visual.Remove("optionsFrom");
                visual["options"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["id"] = "glass",
                        ["label"] = "Glass",
                        ["detail"] = "A look.",
                        ["promptFragment"] = "Use this look.",
                        ["preview"] = new JsonObject { ["styleId"] = "not-real" },
                    },
                };
            });
            AssertFails(root, "content/stages/design.json: Visual option 'glass' points at unknown style 'not-real'.");
        });
    }

    [Fact]
    public void StyleMissingToken_FailsTheStartupGate()
    {
        WithCopy(root =>
        {
            Mutate(root, "content/styles/glassmorphism.json", style => style["tokens"]!.AsObject().Remove("font"));
            AssertFails(root, "content/styles/glassmorphism.json: Style 'glassmorphism' is missing token 'font'.");
        });
    }

    [Fact]
    public void EmptyTemplate_FailsTheStartupGate()
    {
        WithCopy(root =>
        {
            File.WriteAllText(Path.Combine(root, "templates", "intent.md"), " \n");
            AssertFails(root, "content/templates/intent.json: Template file 'templates/intent.md' is empty.");
        });
    }

    [Fact]
    public void PromptShellMissingStagesPlaceholder_FailsTheStartupGate()
    {
        WithCopy(root =>
        {
            File.WriteAllText(Path.Combine(root, "content", "prompt", "shell.md"), "No placeholder here.\n");
            AssertFails(root, "content/prompt/shell.md: {{stages}} must appear once (found 0).");
        });
    }

    [Fact]
    public void Export_BadContent_ExitsNonZeroAndWritesNothing()
    {
        WithCopy(root =>
        {
            File.Delete(Path.Combine(root, "content", "stages", "plan.json"));
            var output = Path.Combine(root, "out");
            var log = new StringWriter();
            var code = ContentExport.Run(root, output, log);
            Assert.Equal(1, code);
            Assert.Contains("content/stages/plan.json", log.ToString(), StringComparison.Ordinal);
            Assert.False(Directory.Exists(output));
        });
    }

    [Fact]
    public void Export_RelativePath_IsFromTheRepositoryRoot()
    {
        var repo = Repo();
        var relative = "web/public/data-export-test";
        var output = Path.Combine(repo, relative);
        try
        {
            var log = new StringWriter();
            var code = Program.Execute(["export", relative], log);
            Assert.Equal(0, code);
            Assert.True(File.Exists(Path.Combine(output, "stages.json")));
            Assert.True(File.Exists(Path.Combine(output, "prompt.json")));
            Assert.False(Directory.Exists(Path.Combine(repo, "api", relative)));
        }
        finally
        {
            if (Directory.Exists(output))
            {
                Directory.Delete(output, true);
            }
        }
    }

    [Fact]
    public void Export_WithoutADirectory_PrintsUsage()
    {
        var log = new StringWriter();
        var code = Program.Execute(["export"], log);
        Assert.Equal(1, code);
        Assert.Contains("Usage: dotnet run --project api -- export <output-directory>", log.ToString(), StringComparison.Ordinal);
    }

    private static void WithCopy(Action<string> act)
    {
        var root = CopyReal();
        try
        {
            act(root);
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    private static void AssertFails(string root, string line)
    {
        var log = new StringWriter();
        var code = ContentGate.Check(root, log);
        Assert.Equal(1, code);
        Assert.Contains(line, log.ToString(), StringComparison.Ordinal);
    }

    private static string Repo()
    {
        return RepositoryRoot.Locate(AppContext.BaseDirectory, Directory.GetCurrentDirectory())
            ?? throw new InvalidOperationException("Repository root does not exist.");
    }

    private static string CopyReal()
    {
        var repo = Repo();
        var root = Directory.CreateTempSubdirectory("sdlc-gate-").FullName;
        CopyDirectory(Path.Combine(repo, "content"), Path.Combine(root, "content"));
        CopyDirectory(Path.Combine(repo, "templates"), Path.Combine(root, "templates"));
        return root;
    }

    private static void Mutate(string root, string relativePath, Action<JsonObject> mutate)
    {
        var path = Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar));
        var node = JsonNode.Parse(File.ReadAllText(path))!.AsObject();
        mutate(node);
        File.WriteAllText(path, node.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
    }

    private static JsonObject Group(JsonObject stage, string groupId)
    {
        return stage["optionGroups"]!.AsArray()
            .First(group => group!["id"]!.GetValue<string>() == groupId)!
            .AsObject();
    }

    private static void CopyDirectory(string source, string destination)
    {
        Directory.CreateDirectory(destination);
        foreach (var file in Directory.EnumerateFiles(source))
        {
            File.Copy(file, Path.Combine(destination, Path.GetFileName(file)));
        }

        foreach (var directory in Directory.EnumerateDirectories(source))
        {
            CopyDirectory(directory, Path.Combine(destination, Path.GetFileName(directory)));
        }
    }
}
