Ext.define('FeatureDependencyList', {
  extend: 'Rally.app.App',
  componentCls: 'app', // CSS file
  myModels: ['PortfolioItem/Feature'],
  myGrid: undefined,

  launch: function () {
    var me = this;

    console.log("Create new TreeStore");
    Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
      models: me.myModels,
      //autoLoad: true,
      fetch: ['Predecessors', 'FormattedID', 'Name', 'Successors', 'Project', 'State', 'Release'],
      enableHierarchy: false,
      context: me.getContext().getDataContext(),
      scope: me,
      listeners: {
        scope: me,
        load: function (store) {
          var records = store.getRootNode().childNodes;
          console.log("store:event - load");

          var promises = me._getAllDecessors(records);
          Deft.Promise.all(promises).then({
            scope: me,
            success: function () {
              //all data loaded.
              console.log("_getAllDecessors done");

              if (!me.myGrid) {
                me._onStoreBuilt(store);
              } else {
                console.log("grid already created, me.myGrid = ", me.myGrid);
                //me.myGrid.getGridOrBoard().getView().refresh();
                me.myGrid.refresh();
              }
            },
          });
        }
      }
    }).then({
      success: me._loadStore,
      scope: me
    });
  },

  _loadStore: function (store) {
    console.log("calling store.load()");
    store.load();
  },

  _getAllDecessors: function (records) {
    console.log("_getAllDecessors()");

    //var me = this;
    var promises = [];

    //var records = me.myFeatureStore.getRecords();
    //var records = store.getRootNode().childNodes;

    _.each(records, function (feature) {
      //create the stores to load the collections
      feature.predecessorStore = feature.getCollection('Predecessors');
      feature.successorStore = feature.getCollection('Successors');

      //load the stores and keep track of the load operations
      if (feature.predecessorStore.initialCount > 0) {
        promises.push(feature.predecessorStore.load({
          fetch: ['FormattedID', 'Name', 'Project', 'State', 'Release']
        }));
      }

      if (feature.successorStore.initialCount > 0) {
        promises.push(feature.successorStore.load({
          fetch: ['FormattedID', 'Name', 'Project', 'State', 'Release']
        }));
      }
    }); //_.each

    return promises;
  },




  _onStoreBuilt: function (store) {
    var me = this;
    var context = me.getContext();
    console.log("_onStoreBuilt: function (store) =  ", store);

    
     me.myGrid = me.add({
      xtype: 'rallygridboard',
      modelNames: me.myModels,
      toggleState: 'grid',
      stateful: false,
      //rankable: false,
      context: context,

      plugins: [{
        ptype: 'rallygridboardinlinefiltercontrol',
        inlineFilterButtonConfig: {
          modelNames: me.myModels,
          stateful: true,
          stateId: context.getScopedStateId('ReleaseDependeciesList-Filter'),
          inlineFilterPanelConfig: {
            collapsed: true,
            quickFilterPanelConfig: {
              defaultFields: ['Release']
            }
          }
        }
      }],

      gridConfig: {
        store: store,
        //context: context, //Necessary?
        columnCfgs: [
          /*
                    {
                      align: 'left',
                      xtype: 'templatecolumn',
                      //tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate'),
                      //tpl: Ext.create('Rally.ui.renderer.template.FeatureTemplate'), 
                      text: 'Predecessors',
                      dataIndex: 'Predecessors',
                      width: 300,


                      tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate', {
                        //percentDoneName: 'Budget',
                        //height: '15px',
                        renderer: function (value, metaData, record) {
                          var records = record.predecessorStore.getRecords();
                          console.log("records = ", records);
                          return me._renderSuccessor(records);
                        }
                      })
                    },
                */
          {
            text: 'ID',
            dataIndex: 'FormattedID',
            width: 50
          },
          {
            text: 'Name',
            dataIndex: 'Name',
            flex: 1
          },
          {
            text: 'Release',
            dataIndex: 'Release',
          },
          {
            text: 'State',
            dataIndex: 'State',
          },
          { // Column 'Successors'
            align: 'left',
            text: 'Successors',
            dataIndex: 'Successors',
            width: 300,
            renderer: function (value, metaData, record) {
              console.log("successors:renders");
              var records = record.successorStore.getRecords();
              return me._renderSuccessor(records);
            }
          } // Column 'Successors'
        ] //columnCfg
      }, //gridConfig
      height: me.getHeight()
    });
  },

  /*
    Create lines of predecessors and successors
  */
  _renderSuccessor: function (records) {
    var mFieldOutput = "";

    _.each(records, function (feature) {
      mFieldOutput += Rally.nav.DetailLink.getLink({
        record: feature,
        text: feature.get('FormattedID'),
        showTooltip: true
      });
      // Add the feature name, release and a line break.
      mFieldOutput += ' - ' + feature.get('Name');
      if (feature.get("Release")) {
        mFieldOutput += " (" + feature.get("Release").Name + ")";
      } else {
        mFieldOutput += " (Not planned)";
      }
      mFieldOutput += '<br>';
    }); //_.each
    return mFieldOutput;
  }

});