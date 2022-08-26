import EventEmitter from "events";

const eventEmitter = new EventEmitter();

// eventEmitter.setMaxListeners(6);

export const eventEvent = (eventName: string, data?: any) => {
  eventEmitter.emit(eventName, data);
};

export const listenForEvent = (
  eventName: string,
  callbackFunction: (args: any) => void
) => {
  eventEmitter.on(eventName, callbackFunction);
};
