Template.PDF.events = {
  'click button': function(event){
  		var userID = Session.get('LdapId');
        if (Session.get('search_employee')) {
            userID = Session.get('search_employee');
        }
   		generalHelpers.makePDF(Session.get("startDate"), userID);
  }
};

Template.historyHeader.helpers({
	getTimesheets: function (project) {
		var userId = '';
		if (Session.get('search_employee')) {
			userId = Session.get('search_employee');
		}
		var timesheetsMap = {};
		var timesheets = [];
		var subordinates = ActiveDBService.getEmployeesUnderManager();
		var sort = {
			'sort': { 'userId': 1, 'startDate': -1 }
		}

		if (userId) {
			if (project != '') {
				TimeSheet.find({'userId': userId, 'projectEntriesArray.projectID':project}, sort).forEach(
				function (u) {
					timesheets = ActiveDBService.getTimesheetRowInfo(u, timesheets);
				});
			} else {
				TimeSheet.find({'userId': userId}).sort({userId: 1, startDate: -1}, sort).forEach(
				function (u) {
					timesheets = ActiveDBService.getTimesheetRowInfo(u, timesheets);
				});
			}
		} else {
			if (project != '') {
				TimeSheet.find({'userId': {$in: subordinates}, 'projectEntriesArray.projectID':project}, sort).forEach(
				function (u) {
					timesheets = ActiveDBService.getTimesheetRowInfo(u, timesheets);
				});
			} else {
				TimeSheet.find({'userId': {$in: subordinates}}, sort).forEach(
				function (u) {
					timesheets = ActiveDBService.getTimesheetRowInfo(u, timesheets);
				});
			}
		}
		return timesheets;
	},
	getProjects: function() {
		var projects = [];
		if (Session.get('search_project')) {
			var project = ChargeNumbers.findOne({'id': Session.get('search_project')});
			projects.push(project);
		} else {
			projects = ChargeNumbers.find();
		}
		return projects;
	},
	ActiveTimesheet: function(userId, active){
		if(active && (userId == Session.get('LdapId'))){
			return true;
		}
		return false;
	}
});

Template.historicalEntries.helpers({
	isManager: function() {
		var user = Meteor.users.findOne({'_id':Session.get('LdapId')});
		if (user && (user.manager || user.admin)) {
			return true;
		} else {
			return false;
		}
	}
})

Template.historyInfo.helpers({
	isAdmin: function() {
		var user = Meteor.users.findOne({'_id':Session.get('LdapId')});
		if (user && user.admin){
			return true;
		} else {
			return false;
		}
	}
})

Template.history_month_picker.helpers({
    currentMonth: function () {
        if(Session.get('historyDate') == null){
            var currentTime = new Date();
            currentTime.setDate(1);
            Session.set('historyDate', currentTime);
        }else{
            var currentTime = Session.get('historyDate');
        }
        var month = currentTime.getMonth() + 1;
        var year = currentTime.getFullYear();

        return month + "/" + year;
    }
});

Template.history_month_picker.events({
    'click .prevWeek': function () {
        var startDate = Session.get("historyDate");

        var d2 = new Date(startDate);
        var mo = d2.getMonth() - 1;
        if(mo == -1){
            mo = 11;
            d2.setYear(d2.getFullYear()-1);
        }
        d2.setMonth(mo);

        Session.set("historyDate", d2);
    },
    'click .nextWeek': function () {
        var startDate = Session.get("historyDate");

        var d2 = new Date(startDate);
        var mo = d2.getMonth() + 1;
        if(mo == 12){
            mo = 0;
            d2.setYear(d2.getFullYear()+1);
        }
        d2.setMonth(mo);

        //don't advance past current month
        if (d2 > new Date()) {
            return;
        }

        Session.set("historyDate", d2);
    }
});

Template.historyYearSelect.helpers({
	getYears: function () {
    	var userId = Session.get('LdapId');
    	if (Session.get('search_employee')) {
			userId = Session.get('search_employee');
		}
		var years = [];

		TimeSheet.find({'userId': userId}).forEach(
			function (u) {
				var timesheetYear = u.startDate.split('/')[2];
				if (!(timesheetYear in years)) {
					years[timesheetYear] = {year: timesheetYear};
				}
			});
		return years;
	},

});

Template.historyInfo.events({
    'click .view': function(event){
    	Session.set('current_page', 'historical_timesheet');
    	var row = event.currentTarget.parentNode.parentNode;
    	var startDate = $(row).find('#StartDate')[0].value;
    	Session.set('startDate', startDate);
    	Session.set('search_employee', Meteor.users.findOne({'username': $(row).find('#Employee')[0].value})._id);
    },
    'click .reject': function (event){
	var row = event.currentTarget.parentNode.parentNode;
	var date = $(row).find('#StartDate')[0].value;
	var userId = Meteor.users.findOne({'username': $(row).find('#Employee')[0].value})._id;
	var projectId = event.currentTarget.name;
	var rejectComment = $(row).find('#rejectComment')[0].value;
	alert('date: ' + date + ' userId: ' + userId + ' projectId: ' + projectId + ' rejectComment: ' + rejectComment);
	ActiveDBService.updateApprovalStatusInTimeSheet(date, userId, projectId, false, rejectComment);
	ActiveDBService.updateActiveStatusInTimesheet(date, userId, projectId);
	}
});

Template.SelectedHistoryTimesheet.helpers({
	row: function(){

		var date = Session.get("startDate");
		var user = Session.get('LdapId');
		if (Session.get('search_employee')) {
			user = Session.get('search_employee');
		}
		var sheet = TimeSheet.findOne({'startDate':date,'userId':user});

		var projectEntries = sheet['projectEntriesArray'];

		var rows = [];
		var maxRow=-1;
		for(i = 0; i < projectEntries.length; i++){
			var project = projectEntries[i]['projectID'];
			var sentBack;
			if(projectEntries[i]['SentBack']){
				sentBack = "sentBack";
			}else{
				sentBack = "notSentBack";
			}

			var EntryArray = projectEntries[i]['EntryArray'];
			for(j=0; j< EntryArray.length; j++){
				var comment = EntryArray[j]['Comment'];
				var rowID = EntryArray[j]['rowID'];
				if (rowID > maxRow){
					maxRow=rowID;
				}
				var hours = EntryArray[j]['hours'];
				rows.push({
					'project' : project,
					'sunday' : hours[0],
					'monday' : hours[1],
					'tuesday' : hours[2],
					'wednesday' : hours[3],
					'thursday' : hours[4],
					'friday' : hours[5],
					'saturday' : hours[6],
					'comment' :  comment,
					'rowID' : rowID,
					'sentBack' :sentBack
				});
			}
		}

		function compare(a,b) {
			if (a.rowID < b.rowID)
				return -1;
			if (a.rowID > b.rowID)
				return 1;
			return 0;
		}
		Session.set("max_Row", maxRow);
		return rows.sort(compare);
	},
	project: function(){
		var date = Session.get("startDate");
		var user = Session.get('LdapId');
		if (Session.get('search_employee')) {
			user = Session.get('search_employee');
		}
		var sheet = TimeSheet.findOne({'startDate':date,'userId':user});

		var projectEntries = sheet['projectEntriesArray'];

		var projects = [];

		for(i = 0; i < projectEntries.length; i++){
			var project = projectEntries[i]['projectID'];
			var sentBack;
			if(projectEntries[i]['SentBack']){
				sentBack = "sentBack";
			}else{
				sentBack = "notSentBack";
			}
			projects.push({
				'project' : project,
				'sentBack' : sentBack
			});
		}

		return projects;
	},
	date: function(){
		var date = Session.get("startDate");
		return date;
	},
	timesheethack: function(){
		var date = Session.get("startDate");
		var user = Session.get('LdapId');
		if (Session.get('search_employee')) {
			user = Session.get('search_employee');
		}
		var sheet = TimeSheet.findOne({'startDate':date,'userId':user});

		var projectEntries = sheet['projectEntriesArray'];

		var sentBack = "notSentBack";
		for(i = 0; i < projectEntries.length; i++){
			if(projectEntries[i]['SentBack']){
				sentBack = "sentBack";
			}
		}
		var returned = [];
		returned.push({ 'sentBack' : sentBack });

		return returned;
	},
	employee: function() {
		var employee = Meteor.users.findOne({'_id': Session.get('search_employee')});
		return employee.username;
	}
});

Template.historyProjectHours.helpers({
    'name' : function(projectID){
      var name = ChargeNumbers.findOne({'id' : projectID});
      return name['name'];
    }
});

Template.historyProjectComments.helpers({
	'name' : function(projectID){
	    var name = ChargeNumbers.findOne({'id' : projectID});
	    return name['name'];
	},	
	next: function(projectID) {
		var date = Session.get("startDate");
		var user = Session.get('LdapId');
		if (Session.get('search_employee')) {
			user = Session.get('search_employee');
		}
		var sheet = TimeSheet.findOne({'startDate':date,'userId':user});

		var prEntriesArr = sheet['projectEntriesArray'];

	    var index=0;
	    for(i=0 ; i<prEntriesArr.length ; i++){
	        if(prEntriesArr[i]['projectID'] == projectID){
	            index = i;
	        }
   		 }
		return sheet['projectEntriesArray'][index]['next'];
	},
	issues: function(projectID) {
		var date = Session.get("startDate");
		var user = Session.get('LdapId');
		if (Session.get('search_employee')) {
			user = Session.get('search_employee');
		}
		var sheet = TimeSheet.findOne({'startDate':date,'userId':user});

		var prEntriesArr = sheet['projectEntriesArray'];

	    var index=0;

	    for(i=0 ; i<prEntriesArr.length ; i++){
	        if(prEntriesArr[i]['projectID'] == projectID){
	            index = i;
	        }
	    }

		return sheet['projectEntriesArray'][index]['issues'];
	},
  message: function(projectID) {
    var date = Session.get("startDate");
    var user = Session.get('LdapId');
    if (Session.get('search_employee')) {
		user = Session.get('search_employee');
	}
    var sheet = TimeSheet.findOne({'startDate':date,'userId':user});

    var prEntriesArr = sheet['projectEntriesArray'];

      var index=0;

      for(i=0 ; i<prEntriesArr.length ; i++){
          if(prEntriesArr[i]['projectID'] == projectID){
              index = i;
          }
      }

    return sheet['projectEntriesArray'][index]['rejectMessage'];
  }
});

Template.historyLastSection.helpers({
    genComment: function() {
  		var date = Session.get("startDate");
      var user = Session.get('LdapId');
      if (Session.get('search_employee')) {
		user = Session.get('search_employee');
	  }
      var sheet = TimeSheet.findOne({'startDate':date,'userId':user});

      if(sheet['submitted']){
        $('#generalComment').attr('disabled', 'disabled');
      }

      return sheet['generalComment'];
    },
    concerns: function() {
  		var date = Session.get("startDate");
      var user = Session.get('LdapId');
    	var sheet = TimeSheet.findOne({'startDate':date,'userId':user});

      if(sheet['submitted']){
        $('#concerns').attr('disabled', 'disabled');
      }

    	return sheet['concerns'];

    },
	isAdmin: function() {
		var user = Meteor.users.findOne({'_id':Session.get('LdapId')});
		if (user && user.admin){
			return true;
		} else {
			return false;
		}
	}
})

Template.historyLog.helpers({
    revisions : function(){
    	var revisionArray = [];
    	var date = Session.get("startDate");
		var user = Session.get('LdapId');
		if (Session.get('search_employee')) {
			user = Session.get('search_employee');
		}
    	var revisions = TimeSheet.findOne({'startDate':date,'userId':user}).revision;
    	revisions.forEach(function (r) {
    		var timestamp = r.timestamp.getDate() + "/"
                + (r.timestamp.getMonth()+1)  + "/" 
                + r.timestamp.getFullYear() + " @ "  
                + r.timestamp.getHours() + ":"  
                + r.timestamp.getMinutes();

            var message = "";
            if (r.type == "approval") {
            	message = r.manager + " approved " + r.totalHours + " hours for project " + r.project + ".";
            } else if (r.type == "rejection") {
            	message = r.manager + " rejected " + r.totalHours + " hours for project " + r.project + " with message \"" + r.comment + "\".";
            } else if (r.type == "submission") {
            	message = r.employee + " submitted " + r.totalHours + " hours for project " + r.project + ".";
            };

            revisionArray.push({
            	'timestamp':timestamp,
            	'message':message
            });
    	});
		return revisionArray;
    }
});

Template.historyEmployeeSelect.events({
	'click button': function(event, template){
		var employee = template.find('#employeeSearch').value;

		/* Hack to circumvent an issue where findOne was being recognized as an undefined function
		    for empty strings. */
		var employeeID = '';
		var employees = Meteor.users.find({'username':employee});
		employees.forEach(function (e) {
            employeeID = e._id;
        });

		var project = template.find("#projectSearch").value;
		if (project != ''){
			project = project.split(' - ')[1];
		}
		var projectID = '';
		var projects = ChargeNumbers.find({'name':project});
		projects.forEach(function (p) {
            projectID = p.id;
        });

		var user = Meteor.users.findOne({'_id':Session.get('LdapId')});

		if (user.admin) {
			Session.set('search_employee', employeeID);
		} else if (user.manager) {
			var subordinates = ActiveDBService.getEmployeesUnderManager();
			if (subordinates.indexOf(employeeID) != -1) {
				Session.set('search_employee', employeeID);
			} else {
				Session.set('search_employee', '');
			}
		}
		Session.set('search_project', projectID);

    	Session.set('current_page', 'historical_page');
    }
});

Template.historyEmployeeSelect.rendered = function () {
	Meteor.typeahead.inject();
	//$('.tt-dropdown-menu')

};

Template.historyEmployeeSelect.helpers({
	auto_projects: function () {
		'use strict';
		var person = Meteor.users.findOne({'_id': Session.get('LdapId')});
		if (person == null || (!person.manager && !person.admin)) return;
		//Get first one to set selected row
		//if (person.admin){
		//	var id = ChargeNumbers.findOne().id;
		//}else{
		//	var id = ChargeNumbers.findOne({'manager': person.username}).id;
		//}
		//Session.set('current_project_to_approve', id);
		if (person.admin){
			return ChargeNumbers.find().fetch().map(function(cn){ return '' + cn.id + ' - ' + cn.name;});
		}
		return ChargeNumbers.find({'manager': person.username}).fetch().map(function(cn){ return '' + cn.id + ' - ' + cn.name;});
	
	},
	auto_employees: function () {
		return Meteor.users.find().fetch().map(function(emp){ return emp.username; });
	}
});
