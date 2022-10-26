require("dotenv").config();

const {
  matrix_server,
  bot_username,
  bot_password,
  xylophone_username,
  xylophone_password,
  zebra_username,
  zebra_password,
  xylophone_room_id,
  zebra_room_id,
} = process.env;

global.Olm = require("olm");

const sdk = require("matrix-js-sdk");
const matrixcs = require("matrix-js-sdk/lib/matrix");
const request = require("request");
matrixcs.request(request);

async function startApp() {
  //create client
  const client = sdk.createClient(matrix_server);
  const zebraClient = sdk.createClient(matrix_server);
  const xylophoneClient = sdk.createClient(matrix_server);

  console.log("client created");

  await client.loginWithPassword(bot_username, bot_password);

  await xylophoneClient.loginWithPassword(
    xylophone_username,
    xylophone_password
  );
  await zebraClient.loginWithPassword(zebra_username, zebra_password);

  console.log("starting client");
  await client.startClient({ initialSyncLimit: 10 });
  await xylophoneClient.startClient({ initialSyncLimit: 10 });
  await zebraClient.startClient({ initialSyncLimit: 10 });

  console.log("logging in");

  //load messages
  console.log("loading rooms");

  const xylophoneZebraRooms = {
    xylophone: xylophone_room_id,
    zebra: zebra_room_id,
  };

  const scriptStart = Date.now();

  client.on("Room.timeline", function (event, room, toStartOfTimeline) {
    console.log("an event happened", event.getType(), event.event.content.body);

    const roomId = event.event.room_id;

    const eventTime = event.event.origin_server_ts;

    if (scriptStart > eventTime) {
      return; //don't run commands for old messages
    }

    if (event.getType() !== "m.room.message") {
      return; // only use messages
    }

    if (Object.values(xylophoneZebraRooms).includes(roomId)) {
      const message = event.event.content.body;

      console.log(message);

      console.log(roomId, xylophoneZebraRooms.xylophone);

      if (roomId === xylophoneZebraRooms.xylophone) {
        console.log("message in xylophone");
        if (
          event.event.sender != "@xylophone2:wobbly.app" &&
          event.event.sender != "@zebra2:wobbly.app"
        ) {
          if (message.slice(0, 1) !== "!") {
            client.redactEvent(roomId, event.event.event_id);

            xylophoneClient.sendTextMessage(
              xylophoneZebraRooms.xylophone,
              message
            );
            xylophoneClient.sendTextMessage(xylophoneZebraRooms.zebra, message);
          }

          const commands = {
            "set-name": {
              description:
                "Change the name displayed that your group sends messages from",
              example: "!set-name New Name",
              action: (message, client) => {
                const namesArray = message.split(" ");
                namesArray.shift();
                const newName = namesArray.join(" ");
                console.log(newName);
                client.setDisplayName(newName);
              },
            },
          };

          const command = message.split(" ")[0];

          if (command == "!set-name") {
            commands["set-name"].action(message, xylophoneClient);
          }
        }
      }
      if (roomId === xylophoneZebraRooms.zebra) {
        if (
          event.event.sender != "@xylophone2:wobbly.app" &&
          event.event.sender != "@zebra2:wobbly.app"
        ) {
          if (message.slice(0, 1) !== "!") {
            client.redactEvent(roomId, event.event.event_id);

            zebraClient.sendTextMessage(xylophoneZebraRooms.xylophone, message);
            zebraClient.sendTextMessage(xylophoneZebraRooms.zebra, message);
          }

          const commands = {
            "set-name": {
              description:
                "Change the name displayed that your group sends messages from",
              example: "!set-name New Name",
              action: (message, client) => {
                const namesArray = message.split(" ");
                namesArray.shift();
                const newName = namesArray.join(" ");
                console.log(newName);
                client.setDisplayName(newName);
              },
            },
          };

          const command = message.split(" ")[0];

          if (command == "!set-name") {
            commands["set-name"].action(message, zebraClient);
          }
        }
      }
    }
  });
}

startApp();
