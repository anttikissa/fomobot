// Monitor non-closed orders
async function checkOrderStates() {
	let openOrders = await db.order.select({
		closed_at: null
	});

	log('TODO checkOrderStates', openOrders);

	return;

	for (let order of openOrders) {
		try {
			let btxOrder = await btx.getOrder(order.exchange_id);

			let orderState = {
				amount: btxOrder.Quantity,
				amount_filled: btxOrder.Quantity - btxOrder.QuantityRemaining,
				opened_at: btxOrder.Opened,
				closed_at: btxOrder.Closed,
			};

			function decideStatus(orderState) {
				if (orderState.amount_filled === 0 && orderState.closed_at == null) {
					return 'new';
				} else if (orderState.amount_filled === 0 && orderState.closed_at != null) {
					return 'canceled';
				} else if (orderState.amount_filled === orderState.amount) {
					return 'filled';
				} else if (orderState.amount_filled < orderState.amount) {
					return 'partially_filled';
				}
			}

			orderState.status = decideStatus(orderState);

			let orderChanged = false;
			for (let key in orderState) {
				if (orderState[key] !== order[key]) {
					log('!!! Order has changed.', order, orderState);
					orderChanged = true;
				}
			}

			if (orderChanged) {
				db.order.update(order.id, orderState);
			}
		} catch (err) {
		}
	}

	setTimeout(checkOrderStates, 10000);
}

checkOrderStates();
