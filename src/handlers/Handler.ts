import receivedNotification from "./receivedNotification";
import receivedChat from "./receivedChat";

export default class Handler{
	static receivedChat = receivedChat;
	static receivedNotification = receivedNotification;
}