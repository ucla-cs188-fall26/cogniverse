# Cogniverse

Cogniverse is a local web prototype that turns conversations into a shared, editable knowledge graph. Ask about cooking, coding, sports, or any other subject. Each main topic stores its full answer, and related topics can be connected across separate chats.

Follow the steps below to install the app and run a scenario. Demo mode requires no API key. OpenAI mode supports arbitrary questions.

## 1. Install the prerequisites

Install:

- **Node.js 22** and its included **npm** package manager. Development has been checked with Node.js `22.14.0` and npm `10.9.2`.
- **Git**, if you are cloning the repository rather than downloading it.
- A modern web browser.

Open Terminal or PowerShell and verify the tools are available:

```bash
node --version
npm --version
git --version
```

If a command is not found, install that tool and reopen your terminal before continuing.

## 2. Get the project

For a fresh clone:

```bash
git clone https://github.com/ucla-cs188-fall26/Cogniverse.git
cd Cogniverse
```

If GitHub asks you to authenticate, use an account with access to the repository.
```

Confirm you are in the folder containing `package.json`, `package-lock.json`, and `src/`.

## 3. Install the dependencies

From the project folder, run:

```bash
npm ci
```

This installs the versions recorded in `package-lock.json`. An internet connection is needed for packages that are not already cached.

You do not need to install React, Vite, or TypeScript globally.

## 4. Start the app

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Keep this terminal running. Open the **Local** URL printed by Vite, normally:

```text
http://127.0.0.1:5173/
```

If that port is occupied, Vite may print a different port; use the address it prints. Press **Ctrl+C** in the terminal when you want to stop the server.

**Returning users:** use the same browser and exact address as before. `localhost` and `127.0.0.1`, different ports, and different browser profiles have separate saved workspaces.

## 5. Enable live OpenAI responses

1. Get an API key from the [OpenAI API keys dashboard](https://platform.openai.com/api-keys).
2. If `.env.local` does not already exist, copy the template **once**. If you already have that file, edit it rather than overwriting it.

   macOS / Linux:

   ```bash
   cp .env.example .env.local
   ```

   Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Open `.env.local` in a text editor and set:

   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_OPENAI_MODEL=gpt-4o-mini
   ```

   Replace `your_openai_api_key_here` with your actual key.

4. Stop Vite with **Ctrl+C**, then restart it:

   ```bash
   npm run dev -- --host 127.0.0.1
   ```

5. Reload the app and choose **OpenAI API** in the header.
6. Ask any substantive question, or repeat the demo scenario with live responses. The model chooses topic names and relationships, so live results may vary from the canned demo.

## 7. Explore and edit the shared graph

### Chats and navigation

- **New chat** starts a separate history and keeps the shared graph.
- The **chat dropdown** switches conversations; the pencil button renames the current chat.
- Each chat retains its own unsent draft.
- Clicking a chat concept chip or a connected topic in the inspector navigates to that graph node.
- **Show in chat** opens the source conversation for an answer or excerpt.
- Drag nodes to arrange them, drag the canvas to pan, and use scrolling or the graph controls to zoom. The minimap is available on desktop.

Only the active chat's messages are sent as conversational history. Shared graph topic descriptions are also provided so the model can reuse topics and infer cross-chat connections. One request runs at a time; you can switch chats while a response is pending, and the response returns to its original chat.

### Edit a topic

1. Click the node, then **Edit topic**.
2. Change its name, summary, full answer/details, or context excerpt.
3. Choose **Save changes**, or **Cancel** to discard the draft.

Edits apply across chats. Original source evidence and original answers remain available for reference. Follow-ups on the same topic append answer history without overwriting edited details or dragged positions.

### Add, rename, or delete a connection

- **Add:** click **Add connection** above the graph. Choose two different topics, enter a name, choose shared or directional, and save. You can also use **Add** in a node's connected-topics section, or drag between node handles to open a prefilled form.
- **Rename:** click an edge or **Edit connection** in a node's inspector. Change **Connection name** and save.
- **Delete:** open the connection editor and choose **Delete connection**. Its endpoint nodes and chat messages remain intact.

Shared connections have no arrow. Directional connections point from the first topic to the second. Names may contain spaces and punctuation, up to 80 characters. Blank names, self-links, and duplicate connections are rejected.

Renamed labels are preserved across later replies. Deleted relationships are remembered so the same connection is not immediately recreated automatically. You can explicitly add a deleted connection again.

### Delete a topic and its connections

1. Click a node and scroll to **Delete topic** at the bottom of its inspector.
2. Review the confirmation, which shows the number of connections that will be removed.
3. Confirm to remove the node and all of its incoming, outgoing, shared, and user-created connections.
4. Use **Undo** in the graph notice if you want to restore the most recent deletion.
