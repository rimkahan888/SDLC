using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Sdlc.Api.Tests;

public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Sdlc.Api.Program>>
{
    private readonly WebApplicationFactory<Sdlc.Api.Program> factory;

    public HealthEndpointTests(WebApplicationFactory<Sdlc.Api.Program> factory)
    {
        this.factory = factory;
    }

    [Fact]
    public async Task GetHealthReturnsHealthy()
    {
        using var client = this.factory.CreateClient();

        var response = await client.GetAsync("/health", TestContext.Current.CancellationToken);
        var body = (await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken)).Trim();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", body);
    }
}
