jQuery.sap.declare("crudkapsel.util.Controller");

sap.ui.core.mvc.Controller.extend("crudkapsel.util.Controller", {
	getEventBus : function () {
		return sap.ui.getCore().getEventBus();
	},

	getRouter : function () {
		return sap.ui.core.UIComponent.getRouterFor(this);
	}
});