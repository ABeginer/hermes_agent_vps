import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { Client, GatewayIntentBits } from "discord.js";

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const discordToken = process.env.DISCORD_TOKEN;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

if (!discordToken) {
  console.error("Error: Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

// Initialize Supabase Client
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Initialize Discord Client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Set up ready event listener
client.once("ready", () => {
  console.log(`Bot is online! Logged in as ${client.user.tag}`);
});

// Set up messageCreate event listener
client.on("messageCreate", async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Only proceed if the bot is explicitly @mentioned
  if (!message.mentions.has(client.user)) return;

  // Extract core task description by stripping the @bot mention and trimming whitespace
  const botMentionPattern = new RegExp(`<@!?${client.user.id}>`, "g");
  const taskDescription = message.content.replace(botMentionPattern, "").trim();

  // Return a quick reply asking for details if the extracted description is empty
  if (!taskDescription) {
    await message.reply("Please provide task details after mentioning me.");
    return;
  }

  try {
    // Execute an INSERT into the Supabase tasks table
    const { error } = await supabase.from("tasks").insert([
      {
        title: `Discord Request from ${message.author.username}`,
        description: taskDescription,
        status: "pending",
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      await message.reply(`Failed to add task: ${error.message}`);
      return;
    }

    // Reply confirming the task was added successfully
    await message.reply(`Task added successfully: "${taskDescription}"`);
  } catch (err) {
    console.error("Unexpected error:", err);
    await message.reply("An unexpected error occurred while adding the task to the database.");
  }
});

// Authenticate bot with Discord
client.login(discordToken);
