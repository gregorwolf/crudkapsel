sap.ui.core.mvc.Controller.extend("crudkapsel.view.AddEntry", {

	oAlertDialog : null,
	oBusyDialog : null,

	initializeNewEntryData : function() {
		this.getView().getModel("newEntry").setData({
			Detail: {}
		});
	},

	onInit : function() {
		this.getView().setModel(new sap.ui.model.json.JSONModel(), "newEntry");
		this.initializeNewEntryData();
	},

	showErrorAlert : function(sMessage) {
		jQuery.sap.require("sap.m.MessageBox");
		sap.m.MessageBox.alert(sMessage);
	},

	saveEntry : function(nID) {
		var mNewEntry = this.getView().getModel("newEntry").getData().Detail;
		// Basic payload data
		var mPayload = {
			id: nID.toString(),
			name: mNewEntry.name
		};

		// Send OData Create request
		var oModel = this.getView().getModel();
		oModel.create("/Samples", mPayload, {
			success : jQuery.proxy(function(mOdata) {
				this.initializeNewEntryData();
				sap.ui.core.UIComponent.getRouterFor(this).navTo("detail", {
					from: "master",
					entity: "Samples('" + mOdata.id + "')",
					tab: this.sTab
				}, false);
				jQuery.sap.require("sap.m.MessageToast");
				// ID of newly inserted product is available in mResponse.ID
				this.oBusyDialog.close();
				sap.m.MessageToast.show("Entry '" + mPayload.name + "' added");
			}, this),
			error : jQuery.proxy(function(oError) {
				this.oBusyDialog.close();
				var error = JSON.parse(oError.response.body);
				this.showErrorAlert("Problem creating new entry: " + error.error.message.value);
			}, this)
		});

	},

	onSave : function() {
		// Show message if no product name has been entered
		// Otherwise, get highest existing ID, and invoke create for new product
		if (!this.getView().getModel("newEntry").getProperty("/Detail/name")) {
			if (!this.oAlertDialog) {
				this.oAlertDialog = sap.ui.xmlfragment("crudkapsel.view.NameRequiredDialog", this);
				this.getView().addDependent(this.oAlertDialog);
			}
			this.oAlertDialog.open();
		} else {
			if (!this.oBusyDialog) {
				this.oBusyDialog = new sap.m.BusyDialog();
			}
			this.oBusyDialog.open();
			this.getView().getModel().read("/Samples", {
				urlParameters : {
					"$top" : 1,
					"$orderby" : "id desc",
					"$select" : "id"
				},
				success : jQuery.proxy(function(oData) {
				    var nId = parseInt(oData.results[0].id) + 1;
					this.saveEntry(nId);
				}, this),
				error : jQuery.proxy(function() {
					this.oBusyDialog.close();
					this.showErrorAlert("Cannot determine next ID for new entry");
				}, this)
			});
		}
	},

	onCancel : function() {
		sap.ui.core.UIComponent.getRouterFor(this).backWithoutHash(this.getView());
	},

	onDialogClose : function(oEvent) {
		this.oAlertDialog.close();
	}

});
