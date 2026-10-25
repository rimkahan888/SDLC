using System.Text.RegularExpressions;

namespace Sdlc.Api;

public static class ContentEndpoints
{
    private static readonly Regex IdPattern = new(
        "^[a-z][a-z0-9-]*$",
        RegexOptions.CultureInvariant | RegexOptions.Compiled);

    public static void Map(WebApplication app)
    {
        app.MapGet("/api/stages", (ContentCatalog catalog) => JsonBody(catalog.StagesJson));
        app.MapGet("/api/stages/{id}", (string id, ContentCatalog catalog) => One(id, "stage", catalog.StageJson));
        app.MapGet("/api/templates/{id}", (string id, ContentCatalog catalog) => One(id, "template", catalog.TemplateJson));
        app.MapGet("/api/styles", (ContentCatalog catalog) => JsonBody(catalog.StylesJson));
        app.MapGet("/api/styles/{id}", (string id, ContentCatalog catalog) => One(id, "style", catalog.StyleJson));
        app.MapGet("/api/prompt", (ContentCatalog catalog) => JsonBody(catalog.PromptJson));
    }

    private static IResult JsonBody(string json) =>
        Results.Text(json, "application/json; charset=utf-8");

    private static IResult One(string id, string noun, IReadOnlyDictionary<string, string> bodies)
    {
        if (!IdPattern.IsMatch(id) || !bodies.TryGetValue(id, out var json))
        {
            return Results.Problem(
                type: "https://tools.ietf.org/html/rfc9110#section-15.5.5",
                title: Title(noun),
                detail: $"No {noun} with id '{id}'.",
                statusCode: StatusCodes.Status404NotFound);
        }

        return JsonBody(json);
    }

    private static string Title(string noun) => noun switch
    {
        "stage" => "Stage not found",
        "template" => "Template not found",
        "style" => "Style not found",
        _ => "Not found",
    };
}
