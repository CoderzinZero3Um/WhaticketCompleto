import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import Ticket from "../models/Ticket";
type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date: string;
  updatedAt?: string;
  showAll: string;
  withUnreadMessages: string;
  queueIds: string;
  tags: string;
};
interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
}
export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    updatedAt,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;
  const userId = req.user.id;
  let queueIds: number[] = [];
  let tagsIds: number[] = [];
  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }
  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }
  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    tags: tagsIds,
    pageNumber,
    status,
    date,
    updatedAt,
    showAll,
    userId,
    queueIds,
    withUnreadMessages
  });
  return res.status(200).json({ tickets, count, hasMore });
};
export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, status, userId, queueId }: TicketData = req.body;
  const ticket = await CreateTicketService({
    contactId,
    status,
    userId,
    queueId
  });

  const io = getIO();
  io.to(ticket.status).emit("ticket", {
    action: "update",
    ticket
  });
  // send status to the specific queue channel
  io.to(ticket.status)
    .to(`queue-${ticket.queueId}-${ticket.status}`)
    .emit("ticket", {
      action: "update",
      ticket
    });

  return res.status(200).json(ticket);
};
@@ -138,9 +141,12 @@ export const remove = async (
  const ticket = await DeleteTicketService(ticketId);

  const io = getIO();
  // send delete message to queues of ticket's current status
  io.to(ticket.status)
    .to(ticketId)
    .to("notification")
    .to(`queue-${ticket.queueId}-${ticket.status}`)
    .to(`queue-${ticket.queueId}-notification`)
    .emit("ticket", {
      action: "delete",
      ticketId: +ticketId
