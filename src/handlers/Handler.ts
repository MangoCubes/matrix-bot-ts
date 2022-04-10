import receivedNotification from "./receivedNotification";
import receivedSms from "./receivedSms";

export default class Handler{
	static receivedSms = receivedSms;
	static receivedNotification = receivedNotification;
}