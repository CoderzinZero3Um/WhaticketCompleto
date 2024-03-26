import { Server as SocketIO } from "socket.io";
import { Server } from "http";
import { verify } from "jsonwebtoken";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import authConfig from "../config/auth";
import User from "../models/User";
import Queue from "../models/Queue";
import Ticket from "../models/Ticket";

let io: SocketIO;

@@ -14,7 +17,7 @@ export const initIO = (httpServer: Server): SocketIO => {
    }
  });

 // io.on("connection", socket => {
  io.on("connection", async socket => {
    const { token } = socket.handshake.query;
    let tokenData = null;
    try {
@@ -26,20 +29,68 @@ export const initIO = (httpServer: Server): SocketIO => {
      return io;
    }

    const userId = tokenData.id;

    let user: User = null;
    if (userId && userId !== "undefined" && userId !== "null") {
      user = await User.findByPk(userId, { include: [Queue] });
    }

    logger.info("Client Connected");
    socket.on("joinChatBox", (ticketId: string) => {
      //logger.info("A client joined a ticket channel");
      //socket.join(ticketId);
      if (ticketId === "undefined") {
        return;
      }
      Ticket.findByPk(ticketId).then(
        ticket => {
          // only admin and the current user of the ticket
          // can join the message channel of it.
          if (
            ticket &&
            (ticket.userId === user.id || user.profile === "admin")
          ) {
            logger.debug(`User ${user.id} joined ticket ${ticketId} channel`);
            socket.join(ticketId);
          } else {
            logger.info(
              `Invalid attempt to join chanel of ticket ${ticketId} by user ${user.id}`
            );
          }
        },
        error => {
          logger.error(error, `Error fetching ticket ${ticketId}`);
        }
      );
    });

    socket.on("joinNotification", () => {
     // logger.info("A client joined notification channel");
      //socket.join("notification");
      if (user.profile === "admin") {
        // admin can join all notifications
        logger.debug(`Admin ${user.id} joined the notification channel.`);
        socket.join("notification");
      } else {
        // normal users join notifications of the queues they participate
        user.queues.forEach(queue => {
          logger.debug(`User ${user.id} joined queue ${queue.id} channel.`);
          socket.join(`queue-${queue.id}-notification`);
        });
      }
    });

    socket.on("joinTickets", (status: string) => {
     // logger.info(`A client joined to ${status} tickets channel.`);
      //socket.join(status);
      if (user.profile === "admin") {
        // only admin can join the notifications of a particular status
        logger.debug(`Admin ${user.id} joined ${status} tickets channel.`);
        socket.join(`${status}`);
      } else {
        // normal users can only receive messages of the queues they participate
        user.queues.forEach(queue => {
          logger.debug(
            `User ${user.id} joined queue ${queue.id} ${status} tickets channel.`
          );
          socket.join(`queue-${queue.id}-${status}`);
        });
      }
    });

    socket.on("disconnect", () => {
      logger.info("Client disconnected");
    });
  });
  return io;
};
export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket IO not initialized");
  }
  return io;
};
