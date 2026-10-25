using System.Text.Json;
using System.Text.RegularExpressions;

namespace Sdlc.Api;

public sealed record ContentIssue(string Path, string Reason);

/// <summary>
/// Checks <c>content/</c> and <c>templates/</c> against the content model.
/// The style catalog is required. <c>content/styles</c> must contain the 20 styles
/// in catalog order. A group with <c>optionsFrom: "styles"</c> expands against that catalog.
/// </summary>
public static class ContentValidator
{
    private static readonly Regex IdPattern = new(
        "^[a-z][a-z0-9-]*$",
        RegexOptions.CultureInvariant | RegexOptions.Compiled);

    private static readonly JsonDocumentOptions JsonOptions = new()
    {
        CommentHandling = JsonCommentHandling.Disallow,
        AllowTrailingCommas = false,
    };

    private static readonly string[] TokenKeys =
    [
        "background",
        "surface",
        "text",
        "muted",
        "accent",
        "border",
        "radius",
        "shadow",
        "font",
        "backdrop",
    ];

    private static readonly string[] RequiredStyleIds =
    [
        "minimalism",
        "maximalism",
        "futuristic",
        "vector-art",
        "collage-art",
        "retro",
        "cyberpunk",
        "pop-art",
        "glassmorphism",
        "clay-style",
        "pixel-art",
        "editorial",
        "y2k",
        "swiss-design",
        "surreal",
        "bohemian",
        "victorian",
        "graffiti",
        "aurora",
        "handwritten",
    ];

    private static readonly string[] TemplateIds =
    [
        "intent",
        "agents",
        "docs-rule",
        "definition-of-done",
        "pull-request",
        "maintain-change-request",
    ];

    private static readonly IReadOnlyDictionary<string, ExpectedStage> ExpectedStages =
        new Dictionary<string, ExpectedStage>
        {
            ["plan"] = new("plan", 1,
            [
                Group("change-type", "single", true, "text", exactOptions: ["new-app", "feature", "bug-fix", "refactor"]),
                Group("docs", "multi", false, "text", fragmentPrefix: "Official docs: "),
            ]),
            ["design"] = new("design", 2,
            [
                Group("stack", "single", true, "text"),
                Group("agents", "single", true, "text", requiredOptions: ["generate"]),
                Group("rules", "multi", false, "text"),
                Group("visual-style", "multi", false, "visual", optionsFrom: "styles"),
            ]),
            ["build"] = new("build", 3,
            [
                Group("plan-first", "single", true, "text", defaultOptionId: "accept-plan", exactOptions: ["accept-plan", "implement"]),
                Group("verify", "single", false, "text", exactOptions: ["agent", "author"]),
            ]),
            ["test"] = new("test", 4,
            [
                Group("checks", "multi", true, "text", exactOptions: ["layout-540", "layout-wide", "a11y", "localization", "copy-feedback", "keyboard"]),
                Group("test-types", "multi", false, "text", exactOptions: ["unit", "e2e"]),
            ]),
            ["deploy"] = new("deploy", 5,
            [
                Group("boundary", "single", true, "text", defaultOptionId: "pr", exactOptions: ["pr"]),
                Group("ci", "single", false, "text", exactOptions: ["actions", "none"]),
                Group("target", "single", true, "text", defaultOptionId: "pages", exactOptions: ["pages", "local"]),
            ]),
            ["maintain"] = new("maintain", 6,
            [
                Group("loop", "single", true, "text", defaultOptionId: "change-request", exactOptions: ["change-request"]),
            ]),
        };

    public static IReadOnlyList<ContentIssue> Validate(string repositoryRoot)
    {
        var issues = new List<ContentIssue>();
        if (string.IsNullOrWhiteSpace(repositoryRoot) || !Directory.Exists(repositoryRoot))
        {
            issues.Add(new ContentIssue(repositoryRoot ?? "", "Repository root does not exist."));
            return issues;
        }

        var templates = ValidateTemplates(repositoryRoot, issues);
        var templateIds = templates.Select(template => template.Id).ToHashSet(StringComparer.Ordinal);
        var stages = ValidateStages(repositoryRoot, templateIds, issues);
        CrossCheckTemplates(templates, stages, issues);

        var styles = ValidateStyles(repositoryRoot, issues);
        ValidateVisualExpansion(stages, styles, issues);
        ValidatePrompt(repositoryRoot, issues);
        return issues;
    }

    private static List<TemplateSnapshot> ValidateTemplates(string root, List<ContentIssue> issues)
    {
        var loaded = new List<TemplateSnapshot>();
        var directory = Path.Combine(root, "content", "templates");
        if (!Directory.Exists(directory))
        {
            issues.Add(new ContentIssue("content/templates", "content/templates is missing."));
            return loaded;
        }

        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var fullPath in Directory.EnumerateFiles(directory, "*.json").Order(StringComparer.Ordinal))
        {
            var relativePath = Relative(root, fullPath);
            var fileId = Path.GetFileNameWithoutExtension(fullPath);
            if (!TemplateIds.Contains(fileId, StringComparer.Ordinal))
            {
                issues.Add(new ContentIssue(relativePath, $"Template '{fileId}' is not one of the six template ids."));
            }

            if (!TryParseObject(fullPath, relativePath, issues, out var document, out var stage))
            {
                continue;
            }

            using (document)
            {
                var id = RequireId(stage, "id", relativePath, "", issues);
                var name = RequireString(stage, "name", relativePath, "", issues);
                var stageId = RequireString(stage, "stage", relativePath, "", issues);
                var file = RequireString(stage, "file", relativePath, "", issues);
                if (id is null || name is null || stageId is null || file is null)
                {
                    continue;
                }

                if (!string.Equals(id, fileId, StringComparison.Ordinal))
                {
                    issues.Add(new ContentIssue(relativePath, $"Template id '{id}' does not match file name '{fileId}.json'."));
                }

                if (!seen.Add(id))
                {
                    issues.Add(new ContentIssue(relativePath, $"Template id '{id}' is duplicated."));
                }

                if (!ExpectedStages.ContainsKey(stageId))
                {
                    issues.Add(new ContentIssue(relativePath, $"Template '{id}' has unknown stage '{stageId}'."));
                }

                if (!TryResolveTemplateFile(root, file, out var templatePath, out var problem))
                {
                    issues.Add(new ContentIssue(relativePath, $"Template file '{file}' {problem}"));
                }
                else if (!File.Exists(templatePath))
                {
                    issues.Add(new ContentIssue(relativePath, $"Template file '{file}' is missing."));
                }
                else if (string.IsNullOrWhiteSpace(File.ReadAllText(templatePath)))
                {
                    issues.Add(new ContentIssue(relativePath, $"Template file '{file}' is empty."));
                }

                loaded.Add(new TemplateSnapshot(id, stageId, file, relativePath));
            }
        }

        foreach (var id in TemplateIds)
        {
            if (!seen.Contains(id) && !loaded.Any(template => template.Id == id))
            {
                var existed = Directory.EnumerateFiles(directory, id + ".json").Any();
                if (!existed)
                {
                    issues.Add(new ContentIssue($"content/templates/{id}.json", $"Required template '{id}' is missing."));
                }
            }
        }

        return loaded;
    }

    private static List<StageSnapshot> ValidateStages(
        string root,
        HashSet<string> templateIds,
        List<ContentIssue> issues)
    {
        var loaded = new List<StageSnapshot>();
        var directory = Path.Combine(root, "content", "stages");
        if (!Directory.Exists(directory))
        {
            issues.Add(new ContentIssue("content/stages", "content/stages is missing."));
            return loaded;
        }

        var seenIds = new HashSet<string>(StringComparer.Ordinal);
        var seenFiles = new HashSet<string>(StringComparer.Ordinal);
        foreach (var fullPath in Directory.EnumerateFiles(directory, "*.json").Order(StringComparer.Ordinal))
        {
            var relativePath = Relative(root, fullPath);
            var fileId = Path.GetFileNameWithoutExtension(fullPath);
            seenFiles.Add(fileId);
            if (!ExpectedStages.ContainsKey(fileId))
            {
                issues.Add(new ContentIssue(relativePath, $"Stage file '{fileId}.json' is not one of the six stages."));
            }

            if (!TryParseObject(fullPath, relativePath, issues, out var document, out var stage))
            {
                continue;
            }

            using (document)
            {
                var snapshot = ReadStage(stage, fileId, relativePath, templateIds, issues);
                if (snapshot is null)
                {
                    continue;
                }

                if (!seenIds.Add(snapshot.Id))
                {
                    issues.Add(new ContentIssue(relativePath, $"Stage id '{snapshot.Id}' is duplicated."));
                }

                loaded.Add(snapshot);
            }
        }

        foreach (var id in ExpectedStages.Keys)
        {
            if (!seenFiles.Contains(id))
            {
                issues.Add(new ContentIssue($"content/stages/{id}.json", $"Required stage '{id}' is missing."));
            }
        }

        return loaded;
    }

    private static StageSnapshot? ReadStage(
        JsonElement stage,
        string fileId,
        string relativePath,
        HashSet<string> templateIds,
        List<ContentIssue> issues)
    {
        var id = RequireId(stage, "id", relativePath, "", issues);
        var order = RequireInt(stage, "order", relativePath, "", issues);
        var name = RequireString(stage, "name", relativePath, "", issues);
        var oneLiner = RequireString(stage, "oneLiner", relativePath, "", issues);
        var goal = RequireString(stage, "goal", relativePath, "", issues);
        var keyArtifact = RequireString(stage, "keyArtifact", relativePath, "", issues);
        if (id is null || order is null || name is null || oneLiner is null || goal is null || keyArtifact is null)
        {
            return null;
        }

        if (!string.Equals(id, fileId, StringComparison.Ordinal))
        {
            issues.Add(new ContentIssue(relativePath, $"Stage id '{id}' does not match file name '{fileId}.json'."));
        }

        if (!ExpectedStages.TryGetValue(id, out var expected))
        {
            issues.Add(new ContentIssue(relativePath, $"Stage id '{id}' is not one of plan, design, build, test, deploy, maintain."));
        }
        else if (order.Value != expected.Order)
        {
            issues.Add(new ContentIssue(relativePath, $"Stage '{id}' has order {order.Value}; expected {expected.Order}."));
        }

        var usedIds = new HashSet<string>(StringComparer.Ordinal);
        var steps = RequireArray(stage, "steps", relativePath, "", issues);
        var checks = RequireArray(stage, "doneChecks", relativePath, "", issues);
        var pitfalls = RequireArray(stage, "pitfalls", relativePath, "", issues);
        var quotes = RequireArray(stage, "quotes", relativePath, "", issues);
        var templates = RequireArray(stage, "templates", relativePath, "", issues);
        var groups = RequireArray(stage, "optionGroups", relativePath, "", issues);

        if (steps is { } stepArray)
        {
            if (stepArray.GetArrayLength() == 0)
            {
                issues.Add(new ContentIssue(relativePath, "steps is empty."));
            }

            var index = 0;
            foreach (var step in stepArray.EnumerateArray())
            {
                var location = $"steps[{index}].";
                var stepId = RequireId(step, "id", relativePath, location, issues);
                RequireString(step, "title", relativePath, location, issues);
                RequireString(step, "text", relativePath, location, issues);
                RememberId(usedIds, stepId, relativePath, issues);
                index++;
            }
        }

        if (checks is { } checkArray)
        {
            if (checkArray.GetArrayLength() == 0)
            {
                issues.Add(new ContentIssue(relativePath, "doneChecks is empty."));
            }

            var index = 0;
            foreach (var check in checkArray.EnumerateArray())
            {
                var location = $"doneChecks[{index}].";
                var checkId = RequireId(check, "id", relativePath, location, issues);
                RequireString(check, "text", relativePath, location, issues);
                RememberId(usedIds, checkId, relativePath, issues);
                index++;
            }
        }

        if (pitfalls is { } pitfallArray)
        {
            var index = 0;
            foreach (var pitfall in pitfallArray.EnumerateArray())
            {
                var location = $"pitfalls[{index}].";
                var pitfallId = RequireId(pitfall, "id", relativePath, location, issues);
                RequireString(pitfall, "text", relativePath, location, issues);
                RememberId(usedIds, pitfallId, relativePath, issues);
                index++;
            }
        }

        if (quotes is { } quoteArray)
        {
            var index = 0;
            foreach (var quote in quoteArray.EnumerateArray())
            {
                var location = $"quotes[{index}].";
                RequireString(quote, "text", relativePath, location, issues);
                RequireString(quote, "source", relativePath, location, issues);
                index++;
            }
        }

        var templateList = new List<string>();
        if (templates is { } templateArray)
        {
            var index = 0;
            foreach (var template in templateArray.EnumerateArray())
            {
                if (template.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(template.GetString()))
                {
                    issues.Add(new ContentIssue(relativePath, $"templates[{index}] is empty."));
                }
                else
                {
                    var templateId = template.GetString()!.Trim();
                    if (!IdPattern.IsMatch(templateId))
                    {
                        issues.Add(new ContentIssue(relativePath, $"Template id '{templateId}' does not match {IdPattern}."));
                    }

                    templateList.Add(templateId);
                }

                index++;
            }
        }

        var groupList = new List<GroupSnapshot>();
        if (groups is { } groupArray)
        {
            var index = 0;
            foreach (var group in groupArray.EnumerateArray())
            {
                var snapshot = ReadGroup(group, relativePath, $"optionGroups[{index}].", templateIds, issues);
                if (snapshot is not null)
                {
                    groupList.Add(snapshot);
                }

                index++;
            }
        }

        if (expected is not null)
        {
            var actualIds = groupList.Select(group => group.Id).ToArray();
            var expectedIds = expected.Groups.Select(group => group.Id).ToArray();
            if (!actualIds.SequenceEqual(expectedIds, StringComparer.Ordinal))
            {
                issues.Add(new ContentIssue(relativePath, $"Option groups must be {string.Join(", ", expectedIds)}."));
            }

            foreach (var groupExpected in expected.Groups)
            {
                var actual = groupList.FirstOrDefault(group => group.Id == groupExpected.Id);
                if (actual is not null)
                {
                    CheckGroupContract(actual, groupExpected, relativePath, issues);
                }
            }
        }

        return new StageSnapshot(id, relativePath, templateList, groupList);
    }

    private static GroupSnapshot? ReadGroup(
        JsonElement group,
        string relativePath,
        string location,
        HashSet<string> templateIds,
        List<ContentIssue> issues)
    {
        if (group.ValueKind != JsonValueKind.Object)
        {
            issues.Add(new ContentIssue(relativePath, $"{location} is not an object."));
            return null;
        }

        var id = RequireId(group, "id", relativePath, location, issues);
        var label = RequireString(group, "label", relativePath, location, issues);
        var help = RequireString(group, "help", relativePath, location, issues);
        var selection = RequireString(group, "selection", relativePath, location, issues);
        var isRequired = RequireBool(group, "required", relativePath, location, issues);
        var presentation = RequireString(group, "presentation", relativePath, location, issues);
        if (id is null || label is null || help is null || selection is null || isRequired is null || presentation is null)
        {
            return null;
        }

        if (selection is not ("single" or "multi"))
        {
            issues.Add(new ContentIssue(relativePath, $"Option group '{id}' selection must be single or multi."));
        }

        if (presentation is not ("text" or "visual"))
        {
            issues.Add(new ContentIssue(relativePath, $"Option group '{id}' presentation must be text or visual."));
        }

        var hasOptions = group.TryGetProperty("options", out var optionsElement);
        var hasOptionsFrom = group.TryGetProperty("optionsFrom", out var optionsFromElement);
        string? optionsFrom = null;
        if (hasOptions && hasOptionsFrom)
        {
            issues.Add(new ContentIssue(relativePath, $"Option group '{id}' has both options and optionsFrom."));
        }
        else if (!hasOptions && !hasOptionsFrom)
        {
            issues.Add(new ContentIssue(relativePath, $"Option group '{id}' needs options or optionsFrom."));
        }

        if (hasOptionsFrom)
        {
            if (optionsFromElement.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(optionsFromElement.GetString()))
            {
                issues.Add(new ContentIssue(relativePath, $"Option group '{id}' optionsFrom is empty."));
            }
            else
            {
                optionsFrom = optionsFromElement.GetString()!.Trim();
                if (!string.Equals(optionsFrom, "styles", StringComparison.Ordinal))
                {
                    issues.Add(new ContentIssue(relativePath, $"Option group '{id}' optionsFrom must be \"styles\"."));
                }
            }
        }

        var options = new List<OptionSnapshot>();
        if (hasOptions)
        {
            if (optionsElement.ValueKind != JsonValueKind.Array)
            {
                issues.Add(new ContentIssue(relativePath, $"Option group '{id}' options is not an array."));
            }
            else
            {
                if (optionsElement.GetArrayLength() == 0)
                {
                    issues.Add(new ContentIssue(relativePath, $"Option group '{id}' has no options."));
                }

                var seen = new HashSet<string>(StringComparer.Ordinal);
                var index = 0;
                foreach (var option in optionsElement.EnumerateArray())
                {
                    var optionLocation = $"{location}options[{index}].";
                    var optionId = RequireId(option, "id", relativePath, optionLocation, issues);
                    RequireString(option, "label", relativePath, optionLocation, issues);
                    RequireString(option, "detail", relativePath, optionLocation, issues);
                    var fragment = RequireString(option, "promptFragment", relativePath, optionLocation, issues);
                    if (optionId is not null && !seen.Add(optionId))
                    {
                        issues.Add(new ContentIssue(relativePath, $"Option id '{optionId}' is duplicated in group '{id}'."));
                    }

                    var starters = new List<string>();
                    if (option.ValueKind == JsonValueKind.Object && option.TryGetProperty("starterFiles", out var starterElement))
                    {
                        if (starterElement.ValueKind != JsonValueKind.Array)
                        {
                            issues.Add(new ContentIssue(relativePath, $"Option '{optionId}' starterFiles is not an array."));
                        }
                        else
                        {
                            foreach (var starter in starterElement.EnumerateArray())
                            {
                                var starterId = starter.ValueKind == JsonValueKind.String ? starter.GetString()?.Trim() : null;
                                if (string.IsNullOrEmpty(starterId))
                                {
                                    issues.Add(new ContentIssue(relativePath, $"Option '{optionId}' has an empty starter file."));
                                }
                                else if (!templateIds.Contains(starterId))
                                {
                                    issues.Add(new ContentIssue(relativePath, $"Starter file '{starterId}' is not a template id."));
                                }
                                else
                                {
                                    starters.Add(starterId);
                                }
                            }
                        }
                    }

                    string? styleId = null;
                    JsonElement preview = default;
                    var hasPreview = option.ValueKind == JsonValueKind.Object && option.TryGetProperty("preview", out preview);
                    if (presentation == "visual" && !hasOptionsFrom)
                    {
                        if (!hasPreview || preview.ValueKind != JsonValueKind.Object)
                        {
                            issues.Add(new ContentIssue(relativePath, $"Visual option '{optionId}' is missing preview."));
                        }
                        else
                        {
                            styleId = RequireString(preview, "styleId", relativePath, optionLocation + "preview.", issues);
                        }
                    }
                    else if (hasPreview && preview.ValueKind == JsonValueKind.Object && preview.TryGetProperty("styleId", out var styleElement) && styleElement.ValueKind == JsonValueKind.String)
                    {
                        styleId = styleElement.GetString()?.Trim();
                    }

                    if (optionId is not null)
                    {
                        options.Add(new OptionSnapshot(optionId, fragment, starters, styleId));
                    }

                    index++;
                }
            }
        }

        var defaults = new List<string>();
        if (group.TryGetProperty("defaultOptionIds", out var defaultElement))
        {
            if (defaultElement.ValueKind != JsonValueKind.Array)
            {
                issues.Add(new ContentIssue(relativePath, $"Option group '{id}' defaultOptionIds is not an array."));
            }
            else
            {
                foreach (var entry in defaultElement.EnumerateArray())
                {
                    var defaultId = entry.ValueKind == JsonValueKind.String ? entry.GetString()?.Trim() : null;
                    if (string.IsNullOrEmpty(defaultId))
                    {
                        issues.Add(new ContentIssue(relativePath, $"Option group '{id}' has an empty default id."));
                        continue;
                    }

                    defaults.Add(defaultId);
                }

                if (selection == "single" && defaults.Count > 1)
                {
                    issues.Add(new ContentIssue(relativePath, $"Option group '{id}' is single and has more than one default."));
                }

                foreach (var defaultId in defaults)
                {
                    if (hasOptions && !options.Any(option => option.Id == defaultId))
                    {
                        issues.Add(new ContentIssue(relativePath, $"Default option '{defaultId}' is not in option group '{id}'."));
                    }
                }
            }
        }

        if (id == "agents")
        {
            var generate = options.FirstOrDefault(option => option.Id == "generate");
            if (generate is not null && !generate.StarterFiles.Contains("agents", StringComparer.Ordinal))
            {
                issues.Add(new ContentIssue(relativePath, "Option 'generate' must list starter file 'agents'."));
            }
        }

        return new GroupSnapshot(id, selection, isRequired.Value, presentation, optionsFrom, hasOptions, hasOptionsFrom, options, defaults);
    }

    private static void CheckGroupContract(
        GroupSnapshot actual,
        ExpectedGroup expected,
        string relativePath,
        List<ContentIssue> issues)
    {
        if (!string.Equals(actual.Selection, expected.Selection, StringComparison.Ordinal))
        {
            issues.Add(new ContentIssue(relativePath, $"Option group '{expected.Id}' selection must be {expected.Selection}."));
        }

        if (actual.Required != expected.Required)
        {
            issues.Add(new ContentIssue(relativePath, $"Option group '{expected.Id}' required must be {expected.Required.ToString().ToLowerInvariant()}."));
        }

        if (!string.Equals(actual.Presentation, expected.Presentation, StringComparison.Ordinal))
        {
            issues.Add(new ContentIssue(relativePath, $"Option group '{expected.Id}' presentation must be {expected.Presentation}."));
        }

        if (expected.OptionsFrom is not null && !string.Equals(actual.OptionsFrom, expected.OptionsFrom, StringComparison.Ordinal))
        {
            issues.Add(new ContentIssue(relativePath, $"Option group '{expected.Id}' must set optionsFrom to \"{expected.OptionsFrom}\"."));
        }

        if (expected.DefaultOptionId is not null)
        {
            if (actual.DefaultOptionIds.Count != 1 || actual.DefaultOptionIds[0] != expected.DefaultOptionId)
            {
                issues.Add(new ContentIssue(relativePath, $"Option group '{expected.Id}' must default to '{expected.DefaultOptionId}'."));
            }
        }

        if (expected.ExactOptionIds is not null)
        {
            var actualIds = actual.Options.Select(option => option.Id).ToArray();
            if (!actualIds.SequenceEqual(expected.ExactOptionIds, StringComparer.Ordinal))
            {
                issues.Add(new ContentIssue(relativePath, $"Option group '{expected.Id}' options must be {string.Join(", ", expected.ExactOptionIds)}."));
            }
        }

        if (expected.RequiredOptionIds is not null)
        {
            foreach (var optionId in expected.RequiredOptionIds)
            {
                if (!actual.Options.Any(option => option.Id == optionId))
                {
                    issues.Add(new ContentIssue(relativePath, $"Option group '{expected.Id}' is missing option '{optionId}'."));
                }
            }
        }

        if (expected.FragmentPrefix is not null)
        {
            foreach (var option in actual.Options)
            {
                if (option.Fragment is null || !option.Fragment.StartsWith(expected.FragmentPrefix, StringComparison.Ordinal))
                {
                    issues.Add(new ContentIssue(relativePath, $"Option '{option.Id}' fragment must start with \"{expected.FragmentPrefix}\"."));
                }
            }
        }
    }

    private static void CrossCheckTemplates(
        List<TemplateSnapshot> templates,
        List<StageSnapshot> stages,
        List<ContentIssue> issues)
    {
        foreach (var template in templates)
        {
            var stage = stages.FirstOrDefault(candidate => candidate.Id == template.Stage);
            if (stage is null || !stage.TemplateIds.Contains(template.Id, StringComparer.Ordinal))
            {
                issues.Add(new ContentIssue(template.Path, $"Template '{template.Id}' is not listed by stage '{template.Stage}'."));
            }
        }

        foreach (var stage in stages)
        {
            foreach (var templateId in stage.TemplateIds)
            {
                var template = templates.FirstOrDefault(candidate => candidate.Id == templateId);
                if (template is null)
                {
                    issues.Add(new ContentIssue(stage.Path, $"Template id '{templateId}' is unknown."));
                }
                else if (!string.Equals(template.Stage, stage.Id, StringComparison.Ordinal))
                {
                    issues.Add(new ContentIssue(stage.Path, $"Stage '{stage.Id}' lists template '{templateId}', which belongs to stage '{template.Stage}'."));
                }
            }
        }
    }

    private static StyleCatalog? ValidateStyles(string root, List<ContentIssue> issues)
    {
        var directory = Path.Combine(root, "content", "styles");
        if (!Directory.Exists(directory))
        {
            issues.Add(new ContentIssue("content/styles", "content/styles is missing."));
            foreach (var id in RequiredStyleIds)
            {
                issues.Add(new ContentIssue($"content/styles/{id}.json", $"Required style id '{id}' is missing."));
            }

            return null;
        }

        var catalog = new StyleCatalog();
        foreach (var fullPath in Directory.EnumerateFiles(directory, "*.json").Order(StringComparer.Ordinal))
        {
            if (string.Equals(Path.GetFileName(fullPath), "order.json", StringComparison.Ordinal))
            {
                continue;
            }

            var relativePath = Relative(root, fullPath);
            var fileId = Path.GetFileNameWithoutExtension(fullPath);
            if (!TryParseObject(fullPath, relativePath, issues, out var document, out var style))
            {
                catalog.Styles[fileId] = false;
                continue;
            }

            using (document)
            {
                var id = RequireId(style, "id", relativePath, "", issues);
                RequireString(style, "name", relativePath, "", issues);
                RequireString(style, "description", relativePath, "", issues);
                RequireString(style, "bestFor", relativePath, "", issues);
                RequireString(style, "promptFragment", relativePath, "", issues);
                if (id is not null && !string.Equals(id, fileId, StringComparison.Ordinal))
                {
                    issues.Add(new ContentIssue(relativePath, $"Style id '{id}' does not match file name '{fileId}.json'."));
                }

                var key = id ?? fileId;
                if (catalog.Styles.ContainsKey(key))
                {
                    issues.Add(new ContentIssue(relativePath, $"Style id '{key}' is duplicated."));
                }

                catalog.Styles[key] = HasCompleteTokens(style, key, relativePath, issues);
            }
        }

        foreach (var id in RequiredStyleIds)
        {
            if (!catalog.Styles.ContainsKey(id))
            {
                issues.Add(new ContentIssue($"content/styles/{id}.json", $"Required style id '{id}' is missing."));
            }
        }

        ValidateStyleOrder(root, directory, catalog, issues);
        return catalog;
    }

    private static void ValidateStyleOrder(string root, string directory, StyleCatalog catalog, List<ContentIssue> issues)
    {
        var orderPath = Path.Combine(directory, "order.json");
        var relativePath = Relative(root, orderPath);
        if (!File.Exists(orderPath))
        {
            issues.Add(new ContentIssue(relativePath, "content/styles/order.json is missing."));
            return;
        }

        List<string> listed;
        try
        {
            using var document = JsonDocument.Parse(File.ReadAllText(orderPath), JsonOptions);
            if (document.RootElement.ValueKind != JsonValueKind.Array)
            {
                issues.Add(new ContentIssue(relativePath, "content/styles/order.json must be an array of ids."));
                return;
            }

            listed = [];
            foreach (var entry in document.RootElement.EnumerateArray())
            {
                var id = entry.ValueKind == JsonValueKind.String ? entry.GetString()?.Trim() : null;
                if (string.IsNullOrEmpty(id) || !IdPattern.IsMatch(id))
                {
                    issues.Add(new ContentIssue(relativePath, "content/styles/order.json has an id that does not match the id pattern."));
                    continue;
                }

                if (listed.Contains(id, StringComparer.Ordinal))
                {
                    issues.Add(new ContentIssue(relativePath, $"Style id '{id}' is duplicated in order.json."));
                }

                listed.Add(id);
                if (!catalog.Styles.ContainsKey(id))
                {
                    issues.Add(new ContentIssue(relativePath, $"Style id '{id}' is listed in order.json but has no file."));
                }
            }
        }
        catch (JsonException exception)
        {
            issues.Add(new ContentIssue(relativePath, "JSON is invalid. " + exception.Message));
            return;
        }

        var positions = RequiredStyleIds.Select(id => listed.FindIndex(entry => entry == id)).ToArray();
        for (var index = 0; index < RequiredStyleIds.Length; index++)
        {
            if (positions[index] < 0)
            {
                issues.Add(new ContentIssue(relativePath, $"Required style id '{RequiredStyleIds[index]}' is missing from order.json."));
            }
            else if (index > 0 && positions[index - 1] >= 0 && positions[index] < positions[index - 1])
            {
                issues.Add(new ContentIssue(relativePath, $"Required style id '{RequiredStyleIds[index]}' is out of catalog order."));
            }
        }
    }

    private static bool HasCompleteTokens(JsonElement style, string id, string relativePath, List<ContentIssue> issues)
    {
        if (!style.TryGetProperty("tokens", out var tokens) || tokens.ValueKind != JsonValueKind.Object)
        {
            issues.Add(new ContentIssue(relativePath, $"Style '{id}' is missing tokens."));
            return false;
        }

        var complete = true;
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var property in tokens.EnumerateObject())
        {
            seen.Add(property.Name);
            if (!TokenKeys.Contains(property.Name, StringComparer.Ordinal))
            {
                issues.Add(new ContentIssue(relativePath, $"Style '{id}' token '{property.Name}' is not a token key."));
                complete = false;
                continue;
            }

            if (property.Value.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(property.Value.GetString()))
            {
                issues.Add(new ContentIssue(relativePath, $"Style '{id}' token '{property.Name}' is empty."));
                complete = false;
                continue;
            }

            if (property.Name == "font" && property.Value.GetString()!.Contains("url(", StringComparison.Ordinal))
            {
                issues.Add(new ContentIssue(relativePath, $"Style '{id}' token 'font' contains 'url('."));
                complete = false;
            }
        }

        foreach (var key in TokenKeys)
        {
            if (!seen.Contains(key))
            {
                issues.Add(new ContentIssue(relativePath, $"Style '{id}' is missing token '{key}'."));
                complete = false;
            }
        }

        return complete;
    }

    private static void ValidateVisualExpansion(List<StageSnapshot> stages, StyleCatalog? styles, List<ContentIssue> issues)
    {
        foreach (var stage in stages)
        {
            foreach (var group in stage.Groups)
            {
                if (group.Presentation != "visual")
                {
                    continue;
                }

                if (group.OptionsFrom == "styles")
                {
                    if (styles is null)
                    {
                        foreach (var defaultId in group.DefaultOptionIds)
                        {
                            issues.Add(new ContentIssue(stage.Path, $"Default option '{defaultId}' cannot be resolved until styles exist."));
                        }

                        continue;
                    }

                    foreach (var defaultId in group.DefaultOptionIds)
                    {
                        if (!styles.Styles.ContainsKey(defaultId))
                        {
                            issues.Add(new ContentIssue(stage.Path, $"Default option '{defaultId}' is not in option group '{group.Id}'."));
                        }
                    }

                    foreach (var pair in styles.Styles)
                    {
                        if (!pair.Value)
                        {
                            issues.Add(new ContentIssue(stage.Path, $"Visual option '{pair.Key}' has no preview.tokens after expansion."));
                        }
                    }

                    continue;
                }

                foreach (var option in group.Options)
                {
                    if (string.IsNullOrEmpty(option.StyleId))
                    {
                        continue;
                    }

                    if (styles is null || !styles.Styles.ContainsKey(option.StyleId))
                    {
                        issues.Add(new ContentIssue(stage.Path, $"Visual option '{option.Id}' points at unknown style '{option.StyleId}'."));
                    }
                    else if (!styles.Styles[option.StyleId])
                    {
                        issues.Add(new ContentIssue(stage.Path, $"Visual option '{option.Id}' has no preview.tokens after expansion."));
                    }
                }
            }
        }
    }

    private static void ValidatePrompt(string root, List<ContentIssue> issues)
    {
        RequirePlaceholders(root, "content/prompt/shell.md", ["{{stages}}"], issues);
        RequirePlaceholders(root, "content/prompt/stage.md", ["{{order}}", "{{name}}", "{{fragments}}"], issues);
    }

    private static void RequirePlaceholders(string root, string relativePath, string[] tokens, List<ContentIssue> issues)
    {
        var fullPath = Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(fullPath))
        {
            issues.Add(new ContentIssue(relativePath, $"{relativePath} is missing."));
            return;
        }

        var text = File.ReadAllText(fullPath);
        var stripped = text;
        foreach (var token in tokens)
        {
            var count = Count(text, token);
            if (count != 1)
            {
                issues.Add(new ContentIssue(relativePath, $"{token} must appear once (found {count})."));
            }

            stripped = stripped.Replace(token, "", StringComparison.Ordinal);
        }

        if (stripped.Contains("{{", StringComparison.Ordinal))
        {
            issues.Add(new ContentIssue(relativePath, "contains an unexpected {{ sequence."));
        }
    }

    private static int Count(string text, string token)
    {
        var count = 0;
        var index = 0;
        while ((index = text.IndexOf(token, index, StringComparison.Ordinal)) >= 0)
        {
            count++;
            index += token.Length;
        }

        return count;
    }

    private static bool TryParseObject(
        string fullPath,
        string relativePath,
        List<ContentIssue> issues,
        out JsonDocument document,
        out JsonElement root)
    {
        document = null!;
        root = default;
        try
        {
            document = JsonDocument.Parse(File.ReadAllText(fullPath), JsonOptions);
        }
        catch (JsonException exception)
        {
            issues.Add(new ContentIssue(relativePath, "JSON is invalid. " + exception.Message));
            return false;
        }
        catch (IOException exception)
        {
            issues.Add(new ContentIssue(relativePath, exception.Message));
            return false;
        }

        if (document.RootElement.ValueKind != JsonValueKind.Object)
        {
            issues.Add(new ContentIssue(relativePath, "JSON root must be an object."));
            document.Dispose();
            document = null!;
            return false;
        }

        root = document.RootElement;
        return true;
    }

    private static bool TryResolveTemplateFile(string root, string file, out string fullPath, out string problem)
    {
        fullPath = "";
        if (file.Contains('\\') || file.Contains("..", StringComparison.Ordinal))
        {
            problem = "escapes templates/.";
            return false;
        }

        var parts = file.Split('/');
        if (parts.Length < 2 || parts[0] != "templates" || parts.Any(part => part.Length == 0 || part is "." or ".."))
        {
            problem = "must be a path under templates/.";
            return false;
        }

        fullPath = Path.GetFullPath(Path.Combine(root, file.Replace('/', Path.DirectorySeparatorChar)));
        var templatesRoot = Path.GetFullPath(Path.Combine(root, "templates")) + Path.DirectorySeparatorChar;
        if (!fullPath.StartsWith(templatesRoot, StringComparison.Ordinal))
        {
            problem = "escapes templates/.";
            return false;
        }

        problem = "";
        return true;
    }

    private static void RememberId(HashSet<string> used, string? id, string relativePath, List<ContentIssue> issues)
    {
        if (id is null)
        {
            return;
        }

        if (!used.Add(id))
        {
            issues.Add(new ContentIssue(relativePath, $"Id '{id}' is used more than once across steps, checks, and pitfalls."));
        }
    }

    private static string? RequireId(JsonElement element, string property, string relativePath, string location, List<ContentIssue> issues)
    {
        var value = RequireString(element, property, relativePath, location, issues);
        if (value is null)
        {
            return null;
        }

        if (!IdPattern.IsMatch(value))
        {
            issues.Add(new ContentIssue(relativePath, $"{location}{property} '{value}' does not match {IdPattern}."));
            return null;
        }

        return value;
    }

    private static string? RequireString(JsonElement element, string property, string relativePath, string location, List<ContentIssue> issues)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.String)
        {
            issues.Add(new ContentIssue(relativePath, $"{location}{property} is missing."));
            return null;
        }

        var text = value.GetString() ?? "";
        if (string.IsNullOrWhiteSpace(text))
        {
            issues.Add(new ContentIssue(relativePath, $"{location}{property} is empty."));
            return null;
        }

        return text.Trim();
    }

    private static bool? RequireBool(JsonElement element, string property, string relativePath, string location, List<ContentIssue> issues)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(property, out var value) || value.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
        {
            issues.Add(new ContentIssue(relativePath, $"{location}{property} is missing."));
            return null;
        }

        return value.GetBoolean();
    }

    private static int? RequireInt(JsonElement element, string property, string relativePath, string location, List<ContentIssue> issues)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.Number || !value.TryGetInt32(out var number))
        {
            issues.Add(new ContentIssue(relativePath, $"{location}{property} is missing."));
            return null;
        }

        return number;
    }

    private static JsonElement? RequireArray(JsonElement element, string property, string relativePath, string location, List<ContentIssue> issues)
    {
        if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.Array)
        {
            issues.Add(new ContentIssue(relativePath, $"{location}{property} is missing."));
            return null;
        }

        return value;
    }

    private static string Relative(string root, string fullPath)
    {
        return Path.GetRelativePath(root, fullPath).Replace('\\', '/');
    }

    private static ExpectedGroup Group(
        string id,
        string selection,
        bool required,
        string presentation,
        string? optionsFrom = null,
        string? defaultOptionId = null,
        string[]? exactOptions = null,
        string[]? requiredOptions = null,
        string? fragmentPrefix = null)
    {
        return new ExpectedGroup(id, selection, required, presentation, optionsFrom, defaultOptionId, exactOptions, requiredOptions, fragmentPrefix);
    }

    private sealed record ExpectedStage(string Id, int Order, ExpectedGroup[] Groups);

    private sealed record ExpectedGroup(
        string Id,
        string Selection,
        bool Required,
        string Presentation,
        string? OptionsFrom,
        string? DefaultOptionId,
        string[]? ExactOptionIds,
        string[]? RequiredOptionIds,
        string? FragmentPrefix);

    private sealed record TemplateSnapshot(string Id, string Stage, string File, string Path);

    private sealed record StageSnapshot(string Id, string Path, List<string> TemplateIds, List<GroupSnapshot> Groups);

    private sealed record GroupSnapshot(
        string Id,
        string Selection,
        bool Required,
        string Presentation,
        string? OptionsFrom,
        bool HasOptions,
        bool HasOptionsFrom,
        List<OptionSnapshot> Options,
        List<string> DefaultOptionIds);

    private sealed record OptionSnapshot(string Id, string? Fragment, List<string> StarterFiles, string? StyleId);

    private sealed class StyleCatalog
    {
        public Dictionary<string, bool> Styles { get; } = new(StringComparer.Ordinal);
    }
}
