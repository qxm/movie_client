# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@1.1.1 create --template minimal --types ts --add eslint prettier vitest="usages:component,unit" sveltekit-adapter="adapter:node" --install npm ./
```

## Adding features

Add features to your project with `sv add`:

```sh
npx sv add
```

For example, to add Tailwind CSS:

```sh
npx sv add tailwindcss
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.


## Add Movie

Run the people service (9092), movie service (HTTP 8081 / gRPC 9091), and GraphQL gateway (8080), then run `npm install` and `npm run dev` here. Open `/add` to create a movie with optional year, synopsis, JPEG/PNG poster (up to 5 MB), and cast/crew. Search for existing people or create a person, select their role, and click Add to Movie before submitting.

The frontend server forwards `/api/graphql` to the gateway and `/api/artworks` to the movie service. Optional server environment variables are listed in `.env.example`. For an adapter-node production deployment, set `BODY_SIZE_LIMIT=6M` so multipart posters fit the request limit. Uploaded poster URLs use the same frontend origin and work after refreshing the detail page. Keep the movie service upload directory persistent.

The submit button locks during upload/save. Upload progress is shown; after an upload succeeds, a failed movie submission reuses that upload on retry. A successful create opens the movie detail page. An uploaded poster may remain unused if creation is abandoned; automatic cleanup is not implemented.

AI assistance was used to repair the Add Movie input types, submission flow, poster proxy and progress handling, and to add validation tests. Review these changes before submission.
