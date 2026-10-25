using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Sdlc.Api.Tests;

public class ContentValidatorTests
{
    [Fact]
    public void RealRepository_IsValid()
    {
        AssertValid(FindRepoRoot());
    }

    [Fact]
    public void RealTree_WithBrokenShell_Fails()
    {
        var repo = FindRepoRoot();
        var root = Directory.CreateTempSubdirectory("sdlc-real-").FullName;
        try
        {
            CopyDirectory(Path.Combine(repo, "content"), Path.Combine(root, "content"));
            CopyDirectory(Path.Combine(repo, "templates"), Path.Combine(root, "templates"));
            File.WriteAllText(Path.Combine(root, "content", "prompt", "shell.md"), "broken\n");
            AssertInvalid(root, "{{stages}}");
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public void RealContent_MatchesTheStageContract()
    {
        var root = FindRepoRoot();
        Assert.False(Directory.Exists(Path.Combine(root, "content", "styles")));

        using var plan = ReadStage(root, "plan");
        using var design = ReadStage(root, "design");
        using var build = ReadStage(root, "build");
        using var test = ReadStage(root, "test");
        using var deploy = ReadStage(root, "deploy");
        using var maintain = ReadStage(root, "maintain");

        Assert.Equal("intent.md", plan.RootElement.GetProperty("keyArtifact").GetString());
        Assert.Equal("AGENTS.md and docs/", design.RootElement.GetProperty("keyArtifact").GetString());
        Assert.Equal("Accepted plan", build.RootElement.GetProperty("keyArtifact").GetString());
        Assert.Equal("definition of done", test.RootElement.GetProperty("keyArtifact").GetString());
        Assert.Equal("Pull request", deploy.RootElement.GetProperty("keyArtifact").GetString());
        Assert.Equal("Change request", maintain.RootElement.GetProperty("keyArtifact").GetString());

        var feature = Option(plan, "change-type", "feature");
        Assert.Equal(
            "This is a feature on an existing project. Read the repository before proposing files. Keep the change inside the current architecture.",
            feature.GetProperty("promptFragment").GetString());

        var vue = Option(plan, "docs", "vue");
        Assert.Equal(
            "Official docs: Vue — https://vuejs.org/guide/introduction.html",
            vue.GetProperty("promptFragment").GetString());

        var generate = Option(design, "agents", "generate");
        Assert.Equal(
            "Write AGENTS.md for this project. Start from the starter file templates/AGENTS.md and fill it from the decisions in this prompt.",
            generate.GetProperty("promptFragment").GetString());
        Assert.Equal("agents", generate.GetProperty("starterFiles")[0].GetString());
        Assert.Equal("existing", Option(design, "agents", "existing").GetProperty("id").GetString());
        Assert.Equal("vue-csharp", Option(design, "stack", "vue-csharp").GetProperty("id").GetString());

        var visual = Group(design, "visual-style");
        Assert.Equal("styles", visual.GetProperty("optionsFrom").GetString());
        Assert.False(visual.TryGetProperty("options", out _));

        Assert.Equal("accept-plan", Group(build, "plan-first").GetProperty("defaultOptionIds")[0].GetString());
        Assert.Equal(
            "Done check: at 540px wide there is no horizontal scrolling, and the detail region is a bottom sheet at half the viewport by default.",
            Option(test, "checks", "layout-540").GetProperty("promptFragment").GetString());
        Assert.Equal("pr", Group(deploy, "boundary").GetProperty("defaultOptionIds")[0].GetString());
        Assert.Equal("pages", Group(deploy, "target").GetProperty("defaultOptionIds")[0].GetString());
        Assert.Equal("change-request", Group(maintain, "loop").GetProperty("defaultOptionIds")[0].GetString());

        var references = File.ReadAllText(Path.Combine(root, "docs", "references.md"));
        var urls = Regex.Matches(references, @"\((https://[^)\s]+)\)")
            .Select(match => match.Groups[1].Value)
            .ToHashSet(StringComparer.Ordinal);
        var fragments = Group(plan, "docs").GetProperty("options").EnumerateArray()
            .Select(option => option.GetProperty("promptFragment").GetString() ?? "")
            .ToList();
        Assert.Equal(urls.Count, fragments.Count);
        foreach (var url in urls)
        {
            Assert.Contains(fragments, fragment => fragment.EndsWith("— " + url, StringComparison.Ordinal));
        }
    }

    [Fact]
    public void MissingStage_Fails()
    {
        WithValidTree(root =>
        {
            File.Delete(Path.Combine(root, "content", "stages", "test.json"));
            AssertInvalid(root, "Required stage 'test' is missing.");
        });
    }

    [Fact]
    public void DuplicateStageId_Fails()
    {
        WithValidTree(root =>
        {
            Mutate(root, "content/stages/design.json", stage => stage["id"] = "plan");
            AssertInvalid(root, "Stage id 'plan' is duplicated.");
        });
    }

    [Fact]
    public void UnknownStyle_Fails()
    {
        WithValidTree(root =>
        {
            Mutate(root, "content/stages/design.json", stage =>
            {
                var visual = GroupNode(stage, "visual-style");
                visual.Remove("optionsFrom");
                visual["options"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["id"] = "glass",
                        ["label"] = "Glass",
                        ["detail"] = "A look.",
                        ["promptFragment"] = "Use this look.",
                        ["preview"] = new JsonObject
                        {
                            ["styleId"] = "not-real",
                        },
                    },
                };
            });
            AssertInvalid(root, "points at unknown style 'not-real'");
        });
    }

    [Fact]
    public void StyleMissingToken_Fails()
    {
        WithValidTree(root =>
        {
            var styles = Path.Combine(root, "content", "styles");
            Directory.CreateDirectory(styles);
            File.WriteAllText(
                Path.Combine(styles, "glassmorphism.json"),
                """
                {
                  "id": "glassmorphism",
                  "name": "Glassmorphism",
                  "description": "Translucent panels.",
                  "bestFor": "Overlays.",
                  "tokens": {
                    "background": "#111111",
                    "surface": "#222222",
                    "text": "#ffffff",
                    "muted": "#cccccc",
                    "accent": "#ffffff",
                    "border": "1px solid #ffffff",
                    "radius": "20px",
                    "shadow": "none",
                    "backdrop": "none"
                  },
                  "promptFragment": "Visual style: Glassmorphism."
                }
                """);
            File.WriteAllText(Path.Combine(styles, "order.json"), "[\"glassmorphism\"]\n");
            AssertInvalid(root, "Style 'glassmorphism' is missing token 'font'.");
        });
    }

    [Fact]
    public void PromptShellMissingStagesPlaceholder_Fails()
    {
        WithValidTree(root =>
        {
            File.WriteAllText(Path.Combine(root, "content", "prompt", "shell.md"), "No placeholder here.\n");
            AssertInvalid(root, "{{stages}} must appear once (found 0).");
        });
    }

    [Fact]
    public void SingleGroupWithTwoDefaults_Fails()
    {
        WithValidTree(root =>
        {
            Mutate(root, "content/stages/build.json", stage =>
            {
                GroupNode(stage, "plan-first")["defaultOptionIds"] = new JsonArray("accept-plan", "implement");
            });
            AssertInvalid(root, "is single and has more than one default.");
        });
    }

    [Fact]
    public void GroupWithOptionsAndOptionsFrom_Fails()
    {
        WithValidTree(root =>
        {
            Mutate(root, "content/stages/design.json", stage =>
            {
                GroupNode(stage, "visual-style")["options"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["id"] = "glass",
                        ["label"] = "Glass",
                        ["detail"] = "A look.",
                        ["promptFragment"] = "Use this look.",
                    },
                };
            });
            AssertInvalid(root, "has both options and optionsFrom.");
        });
    }

    [Fact]
    public void UnknownStarterFile_Fails()
    {
        WithValidTree(root =>
        {
            Mutate(root, "content/stages/design.json", stage =>
            {
                var generate = GroupNode(stage, "agents")["options"]!.AsArray()
                    .First(option => option!["id"]!.GetValue<string>() == "generate")!.AsObject();
                generate["starterFiles"] = new JsonArray("nope");
            });
            AssertInvalid(root, "Starter file 'nope' is not a template id.");
        });
    }

    [Fact]
    public void EmptyString_Fails()
    {
        WithValidTree(root =>
        {
            Mutate(root, "content/stages/plan.json", stage => stage["oneLiner"] = "  ");
            AssertInvalid(root, "oneLiner is empty.");
        });
    }

    [Fact]
    public void TemplatePathEscape_Fails()
    {
        WithValidTree(root =>
        {
            Mutate(root, "content/templates/intent.json", template => template["file"] = "../secrets.md");
            AssertInvalid(root, "escapes templates/.");
        });
    }

    private static void WithValidTree(Action<string> act)
    {
        var root = Directory.CreateTempSubdirectory("sdlc-content-").FullName;
        try
        {
            ContentFixture.WriteValid(root);
            act(root);
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    private static void AssertValid(string root)
    {
        var issues = ContentValidator.Validate(root);
        Assert.True(
            issues.Count == 0,
            string.Join(Environment.NewLine, issues.Select(issue => issue.Path + ": " + issue.Reason)));
    }

    private static void AssertInvalid(string root, string reasonFragment)
    {
        var issues = ContentValidator.Validate(root);
        Assert.True(
            issues.Any(issue => issue.Reason.Contains(reasonFragment, StringComparison.Ordinal)),
            string.Join(Environment.NewLine, issues.Select(issue => issue.Path + ": " + issue.Reason)));
    }

    private static void Mutate(string root, string relativePath, Action<JsonObject> mutate)
    {
        var path = Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar));
        var node = JsonNode.Parse(File.ReadAllText(path))!.AsObject();
        mutate(node);
        File.WriteAllText(path, node.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
    }

    private static JsonObject GroupNode(JsonObject stage, string groupId)
    {
        return stage["optionGroups"]!.AsArray()
            .First(group => group!["id"]!.GetValue<string>() == groupId)!
            .AsObject();
    }

    private static JsonDocument ReadStage(string root, string id)
    {
        return JsonDocument.Parse(File.ReadAllText(Path.Combine(root, "content", "stages", id + ".json")));
    }

    private static JsonElement Group(JsonDocument stage, string groupId)
    {
        return stage.RootElement.GetProperty("optionGroups").EnumerateArray()
            .First(group => group.GetProperty("id").GetString() == groupId);
    }

    private static JsonElement Option(JsonDocument stage, string groupId, string optionId)
    {
        return Group(stage, groupId).GetProperty("options").EnumerateArray()
            .First(option => option.GetProperty("id").GetString() == optionId);
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "SDLC.sln")) &&
                Directory.Exists(Path.Combine(dir.FullName, "content", "stages")))
            {
                return dir.FullName;
            }

            dir = dir.Parent;
        }

        throw new InvalidOperationException("Could not find the repository root.");
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

internal static class ContentFixture
{
    public static void WriteValid(string root)
    {
        Directory.CreateDirectory(Path.Combine(root, "content", "stages"));
        Directory.CreateDirectory(Path.Combine(root, "content", "templates"));
        Directory.CreateDirectory(Path.Combine(root, "content", "prompt"));
        Directory.CreateDirectory(Path.Combine(root, "templates"));

        Write(root, "content/prompt/shell.md", "Hello\n\n{{stages}}\n\nDone.\n");
        Write(root, "content/prompt/stage.md", "## {{order}}. {{name}}\n\n{{fragments}}\n");

        foreach (var (id, stage, file) in Templates())
        {
            Write(root, file, "# " + id + "\n");
            WriteJson(root, "content/templates/" + id + ".json", new JsonObject
            {
                ["id"] = id,
                ["name"] = id,
                ["stage"] = stage,
                ["file"] = file,
            });
        }

        WriteJson(root, "content/stages/plan.json", Stage("plan", 1, "intent.md", ["intent"],
        [
            TextGroup("change-type", "single", true, null, "new-app", "feature", "bug-fix", "refactor"),
            TextGroup("docs", "multi", false, null, "vue"),
        ]));
        WriteJson(root, "content/stages/design.json", Stage("design", 2, "AGENTS.md and docs/", ["agents", "docs-rule"],
        [
            TextGroup("stack", "single", true, null, "vue-csharp"),
            TextGroup("agents", "single", true, null, "generate", "existing"),
            TextGroup("rules", "multi", false, null, "official-docs"),
            VisualGroup(),
        ]));
        WriteJson(root, "content/stages/build.json", Stage("build", 3, "Accepted plan", [],
        [
            TextGroup("plan-first", "single", true, "accept-plan", "accept-plan", "implement"),
            TextGroup("verify", "single", false, null, "agent", "author"),
        ]));
        WriteJson(root, "content/stages/test.json", Stage("test", 4, "definition of done", ["definition-of-done"],
        [
            TextGroup("checks", "multi", true, null, "layout-540", "layout-wide", "a11y", "localization", "copy-feedback", "keyboard"),
            TextGroup("test-types", "multi", false, null, "unit", "e2e"),
        ]));
        WriteJson(root, "content/stages/deploy.json", Stage("deploy", 5, "Pull request", ["pull-request"],
        [
            TextGroup("boundary", "single", true, "pr", "pr"),
            TextGroup("ci", "single", false, null, "actions", "none"),
            TextGroup("target", "single", true, "pages", "pages", "local"),
        ]));
        WriteJson(root, "content/stages/maintain.json", Stage("maintain", 6, "Change request", ["maintain-change-request"],
        [
            TextGroup("loop", "single", true, "change-request", "change-request"),
        ]));
    }

    private static IEnumerable<(string Id, string Stage, string File)> Templates()
    {
        yield return ("intent", "plan", "templates/intent.md");
        yield return ("agents", "design", "templates/AGENTS.md");
        yield return ("docs-rule", "design", "templates/docs-rule-example.md");
        yield return ("definition-of-done", "test", "templates/definition-of-done.md");
        yield return ("pull-request", "deploy", "templates/pull_request_template.md");
        yield return ("maintain-change-request", "maintain", "templates/maintain-change-request.md");
    }

    private static JsonObject Stage(string id, int order, string keyArtifact, string[] templates, JsonObject[] groups)
    {
        var templateArray = new JsonArray();
        foreach (var template in templates)
        {
            templateArray.Add(template);
        }

        var groupArray = new JsonArray();
        foreach (var group in groups)
        {
            groupArray.Add(group);
        }

        return new JsonObject
        {
            ["id"] = id,
            ["order"] = order,
            ["name"] = id,
            ["oneLiner"] = "One liner for " + id + ".",
            ["goal"] = "Goal for " + id + ".",
            ["keyArtifact"] = keyArtifact,
            ["steps"] = new JsonArray(Step()),
            ["doneChecks"] = new JsonArray(new JsonObject
            {
                ["id"] = "check",
                ["text"] = "The check is observable.",
            }),
            ["pitfalls"] = new JsonArray(),
            ["quotes"] = new JsonArray(),
            ["templates"] = templateArray,
            ["optionGroups"] = groupArray,
        };
    }

    private static JsonObject Step()
    {
        return new JsonObject
        {
            ["id"] = "step",
            ["title"] = "Step",
            ["text"] = "Do the step.",
        };
    }

    private static JsonObject TextGroup(string id, string selection, bool required, string? defaultId, params string[] optionIds)
    {
        var options = new JsonArray();
        foreach (var optionId in optionIds)
        {
            options.Add(Option(optionId));
        }

        var group = new JsonObject
        {
            ["id"] = id,
            ["label"] = id,
            ["help"] = "Help for " + id + ".",
            ["selection"] = selection,
            ["required"] = required,
            ["presentation"] = "text",
            ["options"] = options,
        };
        if (defaultId is not null)
        {
            group["defaultOptionIds"] = new JsonArray(defaultId);
        }

        return group;
    }

    private static JsonObject VisualGroup()
    {
        return new JsonObject
        {
            ["id"] = "visual-style",
            ["label"] = "Visual style",
            ["help"] = "Pick one or more looks.",
            ["selection"] = "multi",
            ["required"] = false,
            ["presentation"] = "visual",
            ["optionsFrom"] = "styles",
        };
    }

    private static JsonObject Option(string id)
    {
        var fragment = id == "vue"
            ? "Official docs: Vue — https://vuejs.org/guide/introduction.html"
            : "Do " + id + ".";
        var option = new JsonObject
        {
            ["id"] = id,
            ["label"] = id,
            ["detail"] = "Detail for " + id + ".",
            ["promptFragment"] = fragment,
        };
        if (id == "generate")
        {
            option["starterFiles"] = new JsonArray("agents");
        }

        return option;
    }

    private static void WriteJson(string root, string relativePath, JsonObject node)
    {
        Write(root, relativePath, node.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
    }

    private static void Write(string root, string relativePath, string text)
    {
        var path = Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, text);
    }
}
