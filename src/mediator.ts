import { Context, Injectable, Injector } from "tiny-injector";
import { ArgumentNullException } from "./exceptions/ArgumentException";
import { INotification, INotificationHandler } from "./notification";
import { IRequest } from "./request";
import { RequestType } from "./types";
import { isNullOrUndefined } from "./utils";
import { INotificationHandlerWrapper } from "./wrappers/notification-handler-wrapper";
import { RequestHandlerWrapper } from "./wrappers/request-handler-wrapper";
interface ISender {
	send<TResponse>(request: IRequest<TResponse>): Promise<TResponse>;
}

@Injectable()
export class Mediator implements ISender {
	constructor(private context: Context) {}

	public send<TResponse>(request: IRequest<TResponse>): Promise<TResponse> {
		if (isNullOrUndefined(request)) {
			throw new ArgumentNullException("request");
		}

		const requestType = request.constructor;

		const handler = Injector.GetRequiredService<
			RequestHandlerWrapper<TResponse>
		>(requestType, this.context);

		return handler.handle(request, this.context);
	}

	public async publish<TNotification extends INotification>(
		notification: TNotification
	): Promise<void> {
		if (isNullOrUndefined(notification)) {
			throw new ArgumentNullException("notification");
		}

		const handler = Injector.GetRequiredService<
			INotificationHandlerWrapper<TNotification>
		>(INotificationHandlerWrapper);

		return handler.handle(
			notification,
			this.context,
			async (handlers, notification) =>
				this.publishCore(handlers, notification as TNotification)
		);
	}

	protected async publishCore<TNotification extends INotification>(
		handlers: INotificationHandler<TNotification>[],
		notification: TNotification
	) {
		for (const item of handlers) {
			await item.handle(notification);
		}
	}
}

function getOrAdd(
	map: WeakMap<RequestType<IRequest<any>>, any>,
	key: RequestType<IRequest<any>>,
	value: any
) {
	if (map.has(key)) {
		return map.set(key, value);
	}
	return map.get(key);
}
