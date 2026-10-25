using System.Net;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Hosting;
using Sdlc.Api;

namespace Sdlc.Api.Tests;

public sealed class ApiFixture : WebApplicationFactory<Sdlc.Api.Program>
{
    public ApiFixture()
    {
        Repo = RepositoryRoot.Locate(AppContext.BaseDirectory, Directory.GetCurrentDirectory())
            ?? throw new InvalidOperationException("Repository root does not exist.");
        ExportDir = Directory.CreateTempSubdirectory("sdlc-export-").FullName;
        var log = new StringWriter();
        var code = Program.Execute(["export", ExportDir], log);
        if (code != 0)
        {
            throw new InvalidOperationException(log.ToString());
        }
    }

    public string Repo { get; }

    public string ExportDir { get; }

    protected override void Dispose(bool disposing)
    {
        if (disposing && Directory.Exists(ExportDir))
        {
            Directory.Delete(ExportDir, true);
        }

        base.Dispose(disposing);
    }
}

public class ContentApiTests : IClassFixture<ApiFixture>
{
    private static readonly string[] StageIds = ["plan", "design", "build", "test", "deploy", "maintain"];

    private static readonly string[] TemplateIds =
    [
        "intent",
        "agents",
        "docs-rule",
        "definition-of-done",
        "pull-request",
        "maintain-change-request",
    ];

    private readonly ApiFixture fixture;

    public ContentApiTests(ApiFixture fixture)
    {
        this.fixture = fixture;
    }

    [Fact]
    public async Task GetStages_ReturnsSixExpandedStages()
    {
        var body = await GetJson("/api/stages");
        var stages = body.AsArray();
        Assert.Equal(StageIds, stages.Select(stage => stage!["id"]!.GetValue<string>()).ToArray());
        AssertNoOptionsFrom(body);

        var plan = stages[0]!.AsObject();
        Assert.Equal("intent.md", plan["keyArtifact"]!.GetValue<string>());
        Assert.Equal("oneLiner", plan.Select(pair => pair.Key).First(key => key.Contains("Liner", StringComparison.Ordinal)));
        var feature = Option(plan, "change-type", "feature");
        Assert.Equal(
            "This is a feature on an existing project. Read the repository before proposing files. Keep the change inside the current architecture.",
            feature["promptFragment"]!.GetValue<string>());
        Assert.False(feature.ContainsKey("preview"));

        var design = stages[1]!.AsObject();
        var visual = Group(design, "visual-style");
        Assert.False(visual.ContainsKey("optionsFrom"));
        Assert.Equal("visual", visual["presentation"]!.GetValue<string>());
        var options = visual["options"]!.AsArray();
        Assert.Equal(20, options.Count);
        Assert.Equal("minimalism", options[0]!["id"]!.GetValue<string>());
        Assert.Equal("handwritten", options[19]!["id"]!.GetValue<string>());
        var glass = options.First(option => option!["id"]!.GetValue<string>() == "glassmorphism")!.AsObject();
        Assert.Equal("glassmorphism", glass["preview"]!["styleId"]!.GetValue<string>());
        Assert.False(string.IsNullOrWhiteSpace(glass["preview"]!["bestFor"]!.GetValue<string>()));
        Assert.Equal(
            "linear-gradient(145deg, #5b4bff 0%, #d946ef 48%, #22d3ee 100%)",
            glass["preview"]!["tokens"]!["background"]!.GetValue<string>());
        foreach (var key in new[] { "background", "surface", "text", "muted", "accent", "border", "radius", "shadow", "font", "backdrop" })
        {
            Assert.False(string.IsNullOrWhiteSpace(glass["preview"]!["tokens"]![key]!.GetValue<string>()));
        }

        var build = stages[2]!.AsObject();
        Assert.Equal("accept-plan", Group(build, "plan-first")["defaultOptionIds"]![0]!.GetValue<string>());

        await AssertSameJson(body, "stages.json");
        foreach (var id in StageIds)
        {
            var one = await GetJson("/api/stages/" + id);
            Assert.True(JsonNode.DeepEquals(one, stages.First(stage => stage!["id"]!.GetValue<string>() == id)));
            await AssertSameJson(one, "stages/" + id + ".json");
        }
    }

    [Fact]
    public async Task GetStyles_ReturnsTheCatalogInOrder()
    {
        var body = await GetJson("/api/styles");
        var order = JsonNode.Parse(File.ReadAllText(Path.Combine(fixture.Repo, "content", "styles", "order.json")))!.AsArray();
        Assert.Equal(
            order.Select(id => id!.GetValue<string>()).ToArray(),
            body.AsArray().Select(style => style!["id"]!.GetValue<string>()).ToArray());

        var source = JsonNode.Parse(File.ReadAllText(Path.Combine(fixture.Repo, "content", "styles", "glassmorphism.json")))!.AsObject();
        var glass = body.AsArray().First(style => style!["id"]!.GetValue<string>() == "glassmorphism")!.AsObject();
        Assert.Equal(source["promptFragment"]!.GetValue<string>(), glass["promptFragment"]!.GetValue<string>());
        Assert.True(JsonNode.DeepEquals(source["tokens"], glass["tokens"]));
        Assert.Equal(source["name"]!.GetValue<string>(), glass["name"]!.GetValue<string>());
        Assert.DoesNotContain("url(", glass["tokens"]!["font"]!.GetValue<string>(), StringComparison.Ordinal);

        await AssertSameJson(body, "styles.json");
        foreach (var style in body.AsArray())
        {
            var id = style!["id"]!.GetValue<string>();
            var one = await GetJson("/api/styles/" + id);
            Assert.True(JsonNode.DeepEquals(one, style));
            await AssertSameJson(one, "styles/" + id + ".json");
        }
    }

    [Fact]
    public async Task GetTemplates_FillsMarkdownAndKeepsTheRepoRelativePath()
    {
        foreach (var id in TemplateIds)
        {
            using var client = fixture.CreateClient();
            var response = await client.GetAsync("/api/templates/" + id, TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
            var body = await ReadJson(response);
            var template = body.AsObject();
            var index = JsonNode.Parse(File.ReadAllText(Path.Combine(fixture.Repo, "content", "templates", id + ".json")))!.AsObject();
            var file = index["file"]!.GetValue<string>();
            Assert.Equal(id, template["id"]!.GetValue<string>());
            Assert.Equal(index["name"]!.GetValue<string>(), template["name"]!.GetValue<string>());
            Assert.Equal(index["stage"]!.GetValue<string>(), template["stage"]!.GetValue<string>());
            Assert.Equal(file, template["file"]!.GetValue<string>());
            Assert.False(Path.IsPathRooted(template["file"]!.GetValue<string>()));
            Assert.Equal(
                File.ReadAllText(Path.Combine(fixture.Repo, file.Replace('/', Path.DirectorySeparatorChar))),
                template["markdown"]!.GetValue<string>());
            await AssertSameJson(body, "templates/" + id + ".json");
        }
    }

    [Fact]
    public async Task GetPrompt_ReturnsTheShellDocuments()
    {
        var body = await GetJson("/api/prompt");
        var prompt = body.AsObject();
        Assert.Equal(File.ReadAllText(Path.Combine(fixture.Repo, "content", "prompt", "shell.md")), prompt["shell"]!.GetValue<string>());
        Assert.Equal(File.ReadAllText(Path.Combine(fixture.Repo, "content", "prompt", "stage.md")), prompt["stage"]!.GetValue<string>());
        await AssertSameJson(body, "prompt.json");
    }

    [Theory]
    [InlineData("/api/stages/nope", "Stage not found", "No stage with id 'nope'.")]
    [InlineData("/api/stages/Plan", "Stage not found", "No stage with id 'Plan'.")]
    [InlineData("/api/stages/foo_bar", "Stage not found", "No stage with id 'foo_bar'.")]
    [InlineData("/api/templates/missing", "Template not found", "No template with id 'missing'.")]
    [InlineData("/api/styles/Not-A-Style", "Style not found", "No style with id 'Not-A-Style'.")]
    [InlineData("/api/styles/no-such-style", "Style not found", "No style with id 'no-such-style'.")]
    public async Task UnknownId_IsProblemDetails(string path, string title, string detail)
    {
        using var client = fixture.CreateClient();
        var response = await client.GetAsync(path, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = (await ReadJson(response)).AsObject();
        Assert.Equal("https://tools.ietf.org/html/rfc9110#section-15.5.5", body["type"]!.GetValue<string>());
        Assert.Equal(title, body["title"]!.GetValue<string>());
        Assert.Equal(404, body["status"]!.GetValue<int>());
        Assert.Equal(detail, body["detail"]!.GetValue<string>());
    }

    [Fact]
    public async Task Development_AllowsTheViteOrigin()
    {
        using var client = fixture.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/stages");
        request.Headers.Add("Origin", "http://localhost:5173");
        var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("http://localhost:5173", Header(response, "Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Production_DoesNotApplyTheDevCorsPolicy()
    {
        using var factory = fixture.WithWebHostBuilder(builder => builder.UseEnvironment(Environments.Production));
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/prompt");
        request.Headers.Add("Origin", "http://localhost:5173");
        var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    private async Task<JsonNode> GetJson(string path)
    {
        using var client = fixture.CreateClient();
        var response = await client.GetAsync(path, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("utf-8", response.Content.Headers.ContentType?.CharSet);
        return await ReadJson(response);
    }

    private async Task AssertSameJson(JsonNode body, string relative)
    {
        var file = File.ReadAllText(Path.Combine(fixture.ExportDir, relative.Replace('/', Path.DirectorySeparatorChar)));
        var exported = JsonNode.Parse(file);
        Assert.True(JsonNode.DeepEquals(exported, body), relative);
        using var client = fixture.CreateClient();
        var response = await client.GetAsync(RouteFor(relative), TestContext.Current.CancellationToken);
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.Equal(file, text);
    }

    private static string RouteFor(string relative)
    {
        var without = relative.EndsWith(".json", StringComparison.Ordinal)
            ? relative[..^".json".Length]
            : relative;
        return "/api/" + without;
    }

    private static async Task<JsonNode> ReadJson(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return JsonNode.Parse(text)!;
    }

    private static JsonObject Group(JsonObject stage, string id) =>
        stage["optionGroups"]!.AsArray().First(group => group!["id"]!.GetValue<string>() == id)!.AsObject();

    private static JsonObject Option(JsonObject stage, string groupId, string optionId) =>
        Group(stage, groupId)["options"]!.AsArray().First(option => option!["id"]!.GetValue<string>() == optionId)!.AsObject();

    private static void AssertNoOptionsFrom(JsonNode? node)
    {
        if (node is JsonObject obj)
        {
            Assert.False(obj.ContainsKey("optionsFrom"));
            foreach (var pair in obj)
            {
                AssertNoOptionsFrom(pair.Value);
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var item in array)
            {
                AssertNoOptionsFrom(item);
            }
        }
    }

    private static string? Header(HttpResponseMessage response, string name)
    {
        if (response.Headers.TryGetValues(name, out var values))
        {
            return values.Single();
        }

        if (response.Content.Headers.TryGetValues(name, out values))
        {
            return values.Single();
        }

        return null;
    }
}
