jQuery.sap.require("crudkapsel.util.Formatter");
jQuery.sap.require("crudkapsel.util.Controller");
jQuery.sap.require("sap.m.MessageBox");

crudkapsel.util.Controller.extend("crudkapsel.view.Detail", {

	oBusyDialog : null,
	_fragments: {},

	_getFormFragment: function(sName) {
		if (!this._fragments[sName]) {
			this._fragments[sName] = sap.ui.xmlfragment(sName, "crudkapsel.view." + sName, this);
		}
		return this._fragments[sName];
	},

	onExit: function() {
		jQuery.each(this._fragments, function(i, oFrag) {
			oFrag.destroy();
		});
	},

	onInit: function() {
		this.oInitialLoadFinishedDeferred = jQuery.Deferred();

		if (sap.ui.Device.system.phone) {
			//don't wait for the master on a phone
			this.oInitialLoadFinishedDeferred.resolve();
		} else {
			this.getView().setBusy(true);
			this.getEventBus().subscribe("Master", "InitialLoadFinished", this.onMasterLoaded, this);
		}

		this.getRouter().attachRouteMatched(this.onRouteMatched, this);
	},

	onMasterLoaded: function(sChannel, sEvent, oData) {
		if (oData.oListItem) {
			this.bindView(oData.oListItem.getBindingContext().getPath());
			this.getView().setBusy(false);
			this.oInitialLoadFinishedDeferred.resolve();
		}
	},

	onRouteMatched: function(oEvent) {
		var oParameters = oEvent.getParameters();

		jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(function() {
			// when detail navigation occurs, update the binding context
			if (oParameters.name !== "detail") {
				return;
			}

			var sEntityPath = "/" + oParameters.arguments.entity;
			this.bindView(sEntityPath);

		}, this));

	},

	bindView: function(sEntityPath) {
		var oView = this.getView();
		// Set the initial form to be the change one
		var oForm = this._getFormFragment("DetailDisplay");
		oView.byId("idFormContainer").insertContent(oForm);

		oView.bindElement(sEntityPath);

		//Check if the data is already on the client
		if (!oView.getModel().getData(sEntityPath)) {

			// Check that the entity specified actually was found.
			oView.getElementBinding().attachEventOnce("dataReceived", jQuery.proxy(function() {
				var oData = oView.getModel().getData(sEntityPath);
				if (!oData) {
					this.showEmptyView();
					this.fireDetailNotFound();
				} else {
					this.fireDetailChanged(sEntityPath);
				}
			}, this));

		} else {
			this.fireDetailChanged(sEntityPath);
		}
	},

	showEmptyView: function() {
		this.getRouter().myNavToWithoutHash({
			currentView: this.getView(),
			targetViewName: "crudkapsel.view.NotFound",
			targetViewType: "XML"
		});
	},

	fireDetailChanged: function(sEntityPath) {
		this.getEventBus().publish("Detail", "Changed", {
			sEntityPath: sEntityPath
		});
	},

	fireDetailNotFound: function() {
		this.getEventBus().publish("Detail", "NotFound");
	},

	onNavBack: function() {
		// This is only relevant when running on phone devices
		this.getRouter().myNavBack("main");
	},

	onDetailSelect: function(oEvent) {
		sap.ui.core.UIComponent.getRouterFor(this).navTo("detail", {
			entity: oEvent.getSource().getBindingContext().getPath().slice(1),
			tab: oEvent.getParameter("selectedKey")
		}, true);
	},

	onFooterBarButtonPress: function(oEvent) {
		var oModel = this.getView().getModel();
		var oView = this.getView();
		var sEntityPath = oView.mBoundObjects.undefined.sBindingPath;
		var buttonId = oEvent.getSource().getId();
		// Get the pure Button ID
		var fields = buttonId.split('--');
		buttonId = fields[1];
		switch (buttonId) {
			case 'idButtonDelete':
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				sap.m.MessageBox.show(
					"Confirmation", {
						icon: sap.m.MessageBox.Icon.QUESTION,
						title: "Should the entry be deleted?",
						actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
						onClose: function(oAction) {
							if (oAction === sap.m.MessageBox.Action.OK) {
								oModel.remove(sEntityPath, null, function() {
									sap.m.MessageToast.show("Delete successful");
								}, function() {
									sap.m.MessageToast.show("Delete failed");
								});
							}
						},
						styleClass: bCompact ? "sapUiSizeCompact" : ""
					}
				);
				break;
			case 'idButtonSave':
    			if (!this.oBusyDialog) {
    				this.oBusyDialog = new sap.m.BusyDialog();
    			}
    			this.oBusyDialog.open();
				var oData = oModel.getData(sEntityPath);
				oModel.update(sEntityPath, oData, {
        			success : jQuery.proxy(function(mOdata) {
        				this.oBusyDialog.close();
					    sap.m.MessageToast.show("Entry updated");
        			}, this),
        			error : jQuery.proxy(function(oError) {
        				this.oBusyDialog.close();
        				var error = JSON.parse(oError.response.body);
        				this.showErrorAlert("Problem changing entry: " + error.error.message.value);
        			}, this)
        		});
				break;
			default:
				break;
		}
		// Derive action from the button pressed
		var bEditAction = /idButtonEdit$/.test(buttonId);

		// Show the appropriate action buttons
		this.getView().byId("idButtonEdit").setVisible(!bEditAction);
		this.getView().byId("idButtonDelete").setVisible(!bEditAction);
		this.getView().byId("idButtonSave").setVisible(bEditAction);
		this.getView().byId("idButtonCancel").setVisible(bEditAction);

		// Set the right form type
		var oForm = this._getFormFragment(bEditAction ? "DetailChange" : "DetailDisplay");
		var oContainer = this.getView().byId("idFormContainer");
		oContainer.removeContent(0);
		oContainer.insertContent(oForm);
	}
});