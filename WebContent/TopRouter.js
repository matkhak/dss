		jQuery.sap.require("sap.m.routing.RouteMatchedHandler"),
		jQuery.sap.require("sap.ui.core.routing.History"),
		jQuery.sap.require("sap.ui.core.routing.Router"),
		jQuery.sap.declare("tepaup.TopRouter"),
		sap.ui.core.routing.Router
				.extend(
						"dss.TopRouter",
						{
							constructor : function() {
										sap.ui.core.routing.Router.apply(this,
												arguments),
										this._oRouteMatchedHandler = new sap.m.routing.RouteMatchedHandler(
												this)
							},
							destroy : function() {
								sap.ui.core.routing.Router.prototype.destroy
										.apply(this, arguments),
										this._oRouteMatchedHandler.destroy()
							}
						});