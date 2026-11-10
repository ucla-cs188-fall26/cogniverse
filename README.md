# Cogniverse

A local chat prototype for exploring any subject that turns an LLM conversation into a persistent, interactive knowledge graph. Built with React 18, TypeScript (strict), Vite, Tailwind CSS, React Flow v12, Lucide, and the official OpenAI SDK.

## Run locally

1. Install Node.js 20.19+ and run `npm install`.
2. The app starts in **Demo mode** and needs no API key. For live responses, get an OpenAI API key from [the OpenAI dashboard](https://platform.openai.com/api-keys), copy `.env.example` to `.env.local`, and set `VITE_OPENAI_API_KEY`. Restart the dev server, then choose **OpenAI API** in the header.
3. Run `npm run dev` and open the printed local address.

**Never deploy this publicly with a real key.** Vite exposes the API key to the browser. This architecture is only suitable for a local prototype. No key is included in the repository. In OpenAI API mode, a missing key produces a persistent banner and disables sending. Demo mode works offline without a key.

`npm run build` checks TypeScript and creates a production build. `npm test` exercises parsing, sanitization, merge stability, duplicate removal, and layout.

## Try the mock conversation

Choose **Demo mode** in the header (the default for a new workspace; the last selected mode is restored on reload). The numbered buttons above the input stay available throughout the conversation. These use local canned replies with a short simulated delay; no model requests are made.

| Step | Sample question | Sample answer and graph effect |
| --- | --- | --- |
| 1 | How to make a burger | Creates one **Make a burger** node. Click it for the full ingredients, amounts, steps, and tips. |
| 2 | How do I make spaghetti? | Adds a separate **Make spaghetti** node with its own recipe, connected to the burger by an undirected **cooking** link. |
| 3 | How do I caramelize onions for my burger? | Adds one **Caramelize onions** node with its own recipe, connected to the burger by **optional topping for**. |
| 4 | Explain async and await in Python with an example | Adds one topic containing the full explanation and code example. |
| 5 | How does zone defense work in basketball? | Adds one topic containing the explanation, example, and trade-offs. |

Click a concept chip to read its full answer, source excerpt, and neighbors. Drag a node before the next question to see that its position stays fixed. Repeat a question to verify that node and edge counts do not increase. Each sample also works on its own or out of order. Unrecognized questions return instructions with no graph changes. Switching modes preserves the conversation; mock replies remain labeled **DEMO**. **Reset all** clears every chat and the graph and cancels any pending mock reply.

The displayed sample questions, answers, nodes, and edges are in `src/services/topicDemos.ts`. Edit `topicDemoScenarios` to create your own walkthroughs. The earlier research samples remain available by typing their original questions.

## Multiple chats, one graph

Use **New chat** above the message history to start a separate conversation. The chat dropdown switches histories; the pencil button renames the active chat. New chats are automatically named after their first question. Each chat also keeps its own unsent draft.

Every chat contributes to the same graph on the right. For example:

1. Ask **How to make a burger** in one chat.
2. Click **New chat**, then ask **How do I make spaghetti?**
3. The graph contains separate burger and spaghetti recipes connected by **cooking**.
4. Open the burger node and click **Show answer in chat** to switch back to its original conversation and highlight the answer.

Only the active chat's messages are sent as conversation history. Existing graph topic descriptions are shared so the model can reuse topics and connect related ideas across chats. Node answers and source evidence record their originating chat, which is displayed in the inspector.

You can switch or create chats while a reply is pending. The reply is added to its original chat and the shared graph. This prototype processes one request at a time; other chats show a brief status until it completes. Reloading during a pending reply restores a retryable error in the owning chat rather than sending another request automatically.

The workspace is saved on this browser with a short debounce and restored on reload. It does not sync between browsers or devices, and API keys are not part of the saved snapshot. Storage failures display a message while the workspace continues in memory. **Reset all** asks for confirmation before clearing all chats and the shared graph. Creating or switching chats never clears graph data.

## Explore

Ask about cooking, coding, sports, or any other topic or choose a suggested prompt. Replies introduce concepts and labeled relationships. Click a concept card or a chip below a reply to focus the graph and inspect its summary, source quote, and connected concepts. Use **Edit topic** in the inspector to change a concept’s name, summary, full answer/details, or excerpt. **Save changes** updates its card, chat chips, neighbor lists, and graph exports; **Cancel** (or Escape while editing) discards the draft. Changes are shared across chats and saved in this browser, including across later replies and reloads. **Reset all** clears saved chats and the graph. Navigate to a neighbor or return to the originating chat message. Drag cards, pan, zoom, use the minimap, or export the graph as JSON. **Reset all** confirms before clearing all chats and the shared graph and cancels any pending request.

Chats, drafts, graph data, node edits, and the selected response mode are saved together in this browser’s localStorage. In OpenAI API mode, the last 20 user/assistant messages from the active chat and existing concept IDs/labels are sent to `gpt-4o-mini` (override with `VITE_OPENAI_MODEL`). Error bubbles are excluded. Requests use strict Structured Outputs, a 45-second timeout, and no automatic retries; Retry resends the failed context without duplicating the user message.

## Test concept extraction

In **OpenAI API** mode, every substantive request has one main topic named for the user's goal, such as **Make a burger**. The app attaches the complete `chatResponse` to that topic after parsing, so recipes and code are not cut down to a 400-character summary or generated twice. The inspector shows **Full answer**, and graph cards say **Answer inside**.

The model returns `primaryTopic: { id, label, summary, focus }` separately from optional supporting nodes. Supporting nodes are usually unnecessary: ingredients, utensils, and individual steps belong inside the answer. A focused follow-up can become its own topic with a supported relationship to an earlier topic. An elaboration on the same specific subject reuses its ID and appends a new original answer; merely sharing a domain is not a reason to reuse an ID. For example, a burger recipe and a spaghetti recipe are always separate topics; earlier answers, dragged positions, and manual edits are preserved.

For live requests, if main-topic extraction is missing, null, or unusable, a local fallback names a topic from the user's question. For example, **how to make a burger** becomes **Make a burger**. This does not depend on model-provided evidence quotes. Simple greetings and acknowledgments are excluded by a conservative small-talk phrase check. The fallback uses the literal question rather than guessing a subject; nuanced title and synonym quality still depends on the model. Invalid JSON, failed API requests, or an absent answer still produce a normal error and leave the graph untouched.

The main topic's evidence is copied directly from the user question. Supporting nodes and relationships still need `evidence: { source: 'user' | 'assistant', quote }`, checked as an exact excerpt of at most 200 characters from the latest prompt or current answer. Invalid supporting evidence is dropped without removing the main topic or the answer. A maximum of five supporting nodes keeps each exchange to at most six topics. No numeric importance scores are used.

The model separately returns `topicLinks: [{ target, topic }]` for shared themes between distinct topics. Burger and spaghetti nodes can be connected by **cooking**; distinct programming questions can share **programming**. These are inferred associations, shown without arrowheads and labeled **Shared topic** in the inspector. They do not require a fabricated verbatim quote from the current response. Specific factual edges still require source evidence and keep their direction. Duplicate links in reverse directions are merged, and a specific factual relationship takes priority over a redundant inferred link in the same response.

For an explicit request naming a new subject, a local identity check guards against the model accidentally returning an unrelated existing ID. It compares the requested subject with the proposed existing topic's label, original question, ID, and stored focus. Pronoun-based elaborations such as **How long should I cook it?** remain context-sensitive. This is a conservative text-based guard, not an independent semantic classifier; the model still handles nuanced paraphrases and shared-theme selection.

Use **Edit topic → Full answer / details** to customize the displayed answer. Original responses remain available under **Original answers**. Follow-ups on the same topic add answer history without overwriting edited details. Full answers, history, and edits are included in graph JSON exports and are saved in this browser until Reset all or browser data is cleared.

The inspector's **Original evidence** section identifies **Your prompt** or **AI answer** and links to that message. Connected concepts also show the relationship's source excerpt. Editing the context keeps the original evidence intact and displays the edited text separately. Reused concepts retain their original details, evidence, and positions.

Try these checks:

- **How to make a burger**: expect one main topic, then open it to read ingredients and steps.
- **How do I make spaghetti?**: expect a separate recipe node with a **cooking** connection to the burger. The burger answer must remain unchanged.
- **How do I caramelize onions for my burger?**: expect a new recipe topic, ideally linked as a topping rather than a separate node per ingredient.
- **When should I toast the buns?**: check whether the model reuses the burger topic and adds the follow-up answer to its history.
- **Explain async/await in Python**, then **How does zone defense work in basketball?**: inspect the full answers across different subjects.
- **Thanks!**: expect no new topic.
- Rename a topic or edit its full details before a follow-up. Check that edits and node positions stay unchanged.

For feedback, note which important concepts were missed, which unnecessary concepts appeared, and any incorrectly directed or unsupported relationships. The selection policy and strict response schema live in `src/services/extraction.ts`. Topics have no category or type field. The primary topic should name the user's goal or question. Relationship labels are specific to the conversation, such as `ingredient_in`, `depends_on`, or `plays_for`; they are normalized to lowercase words joined by underscores. Stable internal IDs maintain links without imposing a taxonomy.

## Design and limitations

Validation strips optional JSON fences, rejects missing chat text, normalizes IDs, normalizes relationship labels, and drops invalid/dangling/duplicate graph elements. Graph merges preserve original concept details and dragged positions. New concepts use a deterministic three-column grid below the existing bounds. A short highlight identifies newly added concepts; reduced-motion preferences disable animations.

If a model reuses an existing ID for a different meaning, the original concept is retained. IDs normalize to ASCII slugs; labels that produce empty IDs are dropped. Excerpts are checked as exact substrings of the latest user prompt or current AI answer. This verifies attribution, not the factual truth of a claim or whether its meaning fully supports the relationship; those remain model judgments to evaluate. No authentication, server, database, streaming, or automatic semantic deduplication is included.
