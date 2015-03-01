jQuery.sap.declare("crudkapsel.Component");
jQuery.sap.require("crudkapsel.MyRouter");

sap.ui.core.UIComponent.extend("crudkapsel.Component", {
	metadata : {
		name : "CRUD Capsel",
		version : "0.0.1",
		includes : [],
		dependencies : {
			libs : ["sap.m", "sap.ui.layout"],
			components : []
		},

		rootView : "crudkapsel.view.App",

		config : {
			resourceBundle : "i18n/messageBundle.properties",
			serviceConfig : {
				name: "/p598692trial/helloworld/sample/services/samples.xsodata/",
				serviceUrl: "/destinations/XSOdataCC/p598692trial/helloworld/sample/services/samples.xsodata/"
			}
		},

		routing : {
			config : {
				routerClass : crudkapsel.MyRouter,
				viewType : "XML",
				viewPath : "crudkapsel.view",
				targetAggregation : "detailPages",
				clearTarget : false
			},
			routes : [
				{
					pattern : "",
					name : "main",
					view : "Master",
					targetAggregation : "masterPages",
					targetControl : "idAppControl",
					subroutes : [
						{
							pattern : "{entity}/:tab:",
							name : "detail",
							view : "Detail"
						}
					]
				},
				{
					name : "catchallMaster",
					view : "Master",
					targetAggregation : "masterPages",
					targetControl : "idAppControl",
					subroutes : [
						{
							pattern : ":all*:",
							name : "catchallDetail",
							view : "NotFound",
							transition : "show"
						}
					]
				}
			]
		}
	},

	init : function() {
		sap.ui.core.UIComponent.prototype.init.apply(this, arguments);

		var mConfig = this.getMetadata().getConfig();

		// always use absolute paths relative to our own component
		// (relative paths will fail if running in the Fiori Launchpad)
		var oRootPath = jQuery.sap.getModulePath("crudkapsel");

		// set i18n model
		var i18nModel = new sap.ui.model.resource.ResourceModel({
			bundleUrl : [oRootPath, mConfig.resourceBundle].join("/")
		});
		this.setModel(i18nModel, "i18n");

		var oModel;
		if(window.cordova && appContext && !window.sap_webide_companion) {
			var url = appContext.applicationEndpointURL + "/";
			var oHeader = {"X-SMP-APPCID":appContext.applicationConnectionId};
			oModel = new sap.ui.model.odata.v2.ODataModel(url, true, appContext.registrationContext.user, appContext.registrationContext.password, oHeader);
			this._setModel(oModel);
		} else {
			var sServiceUrl = mConfig.serviceConfig.serviceUrl;

			//This code is only needed for testing the application when there is no local proxy available, and to have stable test data.
			var bIsMocked = jQuery.sap.getUriParameters().get("responderOn") === "true";
			// start the mock server for the domain model
			if (bIsMocked) {
				this._startMockServer(sServiceUrl);
			}

			// Create and set domain model to the component
			// only call customized logon dialog when in android companion app to workaround cordova browser for 'basic' auth issue
            if (window.sap_webide_companion) {
                this._openLogonDialog(sServiceUrl);
            } else {
				oModel = new sap.ui.model.odata.v2.ODataModel(sServiceUrl, true);
                this._setModel(oModel);
            }
		}
	},

	_openLogonDialog : function (sServiceUrl) {
	    var logonDialog = new sap.m.Dialog();
    	logonDialog.setTitle("Basic Authentication");
    	
    	var vbox = new sap.m.VBox();
    	this._userInput = new sap.m.Input();
    	this._userInput.setPlaceholder("Username");
    	this._pwdInput = new sap.m.Input();
    	this._pwdInput.setPlaceholder("Password");
    	this._pwdInput.setType(sap.m.InputType.Password);
    	vbox.addItem(this._userInput);
    	vbox.addItem(this._pwdInput);
    	logonDialog.addContent(vbox);
    	
    	var self = this;
    	logonDialog.addButton(new sap.m.Button({text: "OK", press:function(){
    	    logonDialog.close();
    	    
    	    var username = self._userInput.getValue();
    	    var password = self._pwdInput.getValue();
    	    
    	    // Create and set domain model to the component
			 var oModel;
			if(username && password) {
				var auth = "Basic "+btoa(username + ":" + password);
				var uHeader = {"Authorization":auth};
		        oModel = new sap.ui.model.odata.v2.ODataModel(sServiceUrl, true, null, null, uHeader);
    	    } else {
    	        oModel = new sap.ui.model.odata.v2.ODataModel(sServiceUrl, { json: true });
    	    }
            self._setModel(oModel);
    	}}));
    	logonDialog.addButton(new sap.m.Button({text: "Cancel", press: function() {logonDialog.close();}}));
    	logonDialog.open();
	},
	
	_setModel : function (oModel) {
	    oModel.setDefaultBindingMode("TwoWay");
	    this.setModel(oModel);

		// set device model
		var oDeviceModel = new sap.ui.model.json.JSONModel({
			isTouch : sap.ui.Device.support.touch,
			isNoTouch : !sap.ui.Device.support.touch,
			isPhone : sap.ui.Device.system.phone,
			isNoPhone : !sap.ui.Device.system.phone,
			listMode : sap.ui.Device.system.phone ? "None" : "SingleSelectMaster",
			listItemType : sap.ui.Device.system.phone ? "Active" : "Inactive"
		});
		/*
		var oDeviceModel = new sap.ui.model.json.JSONModel({
			isTouch : false,
			isNoTouch : true,
			isPhone : true,
			isNoPhone : false,
			listMode : "None",
			listItemType : "Active"
		});		
		*/
		oDeviceModel.setDefaultBindingMode("OneWay");
		this.setModel(oDeviceModel, "device");

		this.getRouter().initialize();
	},
	
	_startMockServer : function (sServiceUrl) {
		jQuery.sap.require("sap.ui.core.util.MockServer");
		var oMockServer = new sap.ui.core.util.MockServer({
			rootUri: sServiceUrl
		});

		var iDelay = +(jQuery.sap.getUriParameters().get("responderDelay") || 0);
		sap.ui.core.util.MockServer.config({
			autoRespondAfter : iDelay
		});

		oMockServer.simulate("model/metadata.xml", "model/");
		oMockServer.start();


		sap.m.MessageToast.show("Running in demo mode with mock data.", {
			duration: 2000
		});
	}
});