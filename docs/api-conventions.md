# API conventions

The local read API. Contract for the minimal API and for the JSON files the static export writes. The shapes are defined in [content-model.md](content-model.md). How the two outputs stay in step is [architecture.md](architecture.md).

## Routes

| Method and path | Returns | Static file |
| --- | --- | --- |
| `GET /api/stages` | Stage array, ordered by `order`, option groups expanded. | `data/stages.json` |
| `GET /api/stages/{id}` | One stage, or 404. | `data/stages/{id}.json` |
| `GET /api/templates/{id}` | One template (`markdown` filled in), or 404. | `data/templates/{id}.json` |
| `GET /api/styles` | Style array in catalog order. | `data/styles.json` |
| `GET /api/styles/{id}` | One style, or 404. | `data/styles/{id}.json` |
| `GET /api/prompt` | `{ "shell", "stage" }` from `content/prompt/`. | `data/prompt.json` |

`{id}` matches `^[a-z][a-z0-9-]*$`. Anything else is 404.

There is no write route, no auth, and no paging. Six stages, six templates, and twenty styles are small enough to return whole.

## JSON

- UTF-8, `Content-Type: application/json`.
- camelCase property names. Set [`JsonNamingPolicy.CamelCase`](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/customize-properties) on the serializer. Do not hand-camelCase the C# models; the models use PascalCase.
- A stage on the wire always has `optionGroups[].options` filled in. `optionsFrom` is a storage detail and is not returned.
- A visual option on the wire includes `preview.tokens` and `preview.bestFor`, copied from the style file at load time.
- Template `markdown` is the file contents. The response does not include the storage path.

## Errors

Unknown ids use [problem details](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling?view=aspnetcore-8.0):

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.5",
  "title": "Stage not found",
  "status": 404,
  "detail": "No stage with id 'foo'."
}
```

Use the same shape for a missing template, style, or prompt document. `title` names the kind of thing.

Invalid content does not become a 500 at request time. The process validates at startup, logs the file path and the errors, and exits non-zero. The export command does the same validation and the same exit.

## CORS and the dev proxy

The published site never calls this API. In dev, Vite proxies `/api` to `http://localhost:5080`, so the browser stays on the Vite origin ([server proxy](https://vite.dev/config/server-options.html#server-proxy)).

Also add a CORS policy named `dev`, enabled only when the host environment is Development, allowing `http://localhost:5173`. That covers a browser pointed directly at Kestrel. Policy setup is the [CORS middleware](https://learn.microsoft.com/en-us/aspnet/core/security/cors?view=aspnetcore-8.0).

## Export

`dotnet run --project api -- export web/public/data` writes the static files in the table above and exits. It does not start listening. The files match the GET bodies, including list order.
