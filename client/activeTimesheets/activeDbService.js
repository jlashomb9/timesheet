var timesheetsPidUsed = [];
ActiveDBService = {
  getDayTotal: function (day) {
    var date = Session.get('startDate');
    var user = Session.get('LdapId');
    var data = Session.get('editing-user-page');
    var total = 0;
    if (data) {
      var userO = Meteor.users.findOne({username: data.username});
      if (userO) {
        user = userO._id;
      }
    }
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    if (!sheet) {
      return;
    }

    var projectEntries = sheet.projectEntriesArray;
    for (var i = 0; i < projectEntries.length; i++) {
      var EntryArray = projectEntries[i].EntryArray;

      for (var j = 0; j < EntryArray.length; j++) {
        var hours = EntryArray[j].hours;
        total += parseFloat(hours[day]) || 0;
      }
    }
    return total;
  },

  getTotalHoursForProject: function (timesheet, projectId) {
    /*
     For a given timesheet and projectID, this method sums up the total number of hours worked that week.
     */
    var total = 0;
    timesheet.projectEntriesArray.forEach(function (pe) {
      if (pe.projectId === projectId) {
        pe.EntryArray.forEach(function (a) {
          for (var b in a.hours) {
            if (a.hours.hasOwnProperty(b)) {
              total += parseFloat(a.hours[b]) || 0;
            }
          }
        });
        return total;
      }
    });
    return total;
  },

  getEmployeesUnderManager: function () {
    /*
     Get all Employees that have worked for the given manager.
     This is so a manager cannot see historical timesheets for other employees.
     */
    Meteor.user();
    var user = Meteor.users.findOne({'_id': Session.get('LdapId')});

    if (user.admin) {
      var employees = Meteor.users.find();
      var employeeIds = [];
      employees.forEach(function (e) {
        employeeIds.push(e._id);
      });
      return employeeIds;
    }

    if (user.manager) {
      var projects = ChargeNumbers.find({'manager': {$in: user.groups}});
      var projectIds = [];
      projects.forEach(function (p) {
        projectIds.push(p._id);
      });

      var employees = Meteor.users.find({'projects': {$in: projectIds}});
      var employeeIds = [];
      employees.forEach(function (e) {
        employeeIds.push(e._id);
      });

      return employeeIds;
    }

    return [user._id];
  },

  getTimesheetRowInfo: function (sheet, timesheets,projectID) {
    var date = Session.get('historyDate');
    var timesheetsMap = {};
    var timesheetYear = sheet.startDate.split('/')[2];
    var timesheetMonth = sheet.startDate.split('/')[0];
    var employee = Meteor.users.findOne({'_id': sheet.userId}).username;

    if (timesheetYear === date.getFullYear().toString() && (Session.get('yearSelect') ||
        timesheetMonth === (date.getMonth() + 1).toString())) {
      if (!(sheet.startDate in timesheetsMap)) {
        timesheetsMap[sheet.startDate] = timesheets.length;
        timesheets[timesheets.length] = {
          employee: employee,
          startDate: sheet.startDate,
          sun: 0,
          mon: 0,
          tue: 0,
          wed: 0,
          thu: 0,
          fri: 0,
          sat: 0
        };
      }
      for (var pIndex in sheet.projectEntriesArray) {
        if (sheet.projectEntriesArray.hasOwnProperty(pIndex)) {
          for (var eIndex in sheet.projectEntriesArray[pIndex].EntryArray) {
            if (sheet.projectEntriesArray[pIndex].EntryArray.hasOwnProperty(eIndex) && projectID === sheet.projectEntriesArray[pIndex].projectId) {
              var entry = sheet.projectEntriesArray[pIndex].EntryArray[eIndex],
                  days = entry.hours,
                  current = timesheets[timesheetsMap[sheet.startDate]];
              timesheets[timesheetsMap[sheet.startDate]] = {
                employee: employee,
                startDate: sheet.startDate,
                sun: parseFloat(days[0]) + parseFloat(current.sun),
                mon: parseFloat(days[1]) + parseFloat(current.mon),
                tue: parseFloat(days[2]) + parseFloat(current.tue),
                wed: parseFloat(days[3]) + parseFloat(current.wed),
                thu: parseFloat(days[4]) + parseFloat(current.thu),
                fri: parseFloat(days[5]) + parseFloat(current.fri),
                sat: parseFloat(days[6]) + parseFloat(current.sat)
              };
            }
          }
        }
      }
    }

  timesheetsPidUsed.push(projectID);
  return timesheets;
  },

  updateRowInTimeSheet: function (date, user, project, comment, Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, rowID, callback) {
    /*
     Updates a row in an active timesheet.  This should be called from an onBlur event.
     Note that this is implemented by calling removeRowInTimesheet() followed by addRowToTimesheet().
     */
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});
    var prEntriesArr = sheet.projectEntriesArray;
    var entryArrToAdd = null;
    var entryArray = null;
    var entryArray2 = null;
    var index1 = 0;
    var index2 = 0;
    var oldproject;

    //check to make sure editable
    var sentBack;
    var active = sheet.active;
    var submitted = sheet.submitted;
    //active = 1 and (SentBack = true or submitted = false)
    if (active !== 1) {
      return;
    }

    var pSentBacks = {};
    for (var i in sheet.projectApprovalArray) {
      if (sheet.projectApprovalArray.hasOwnProperty(i)) {
        pSentBacks[sheet.projectApprovalArray[i].projectId] = sheet.projectApprovalArray[i].sentBack;
      }
    }

    for (i = 0; i < prEntriesArr.length; i++) {

      entryArray = prEntriesArr[i].EntryArray;
      for (var j = 0; j < entryArray.length; j++) {
        if (entryArray[j].rowID === rowID) {
          entryArray2 = prEntriesArr[i].EntryArray;
          oldproject = prEntriesArr[i].projectId;
          index2 = j;
          index1 = i;
          entryArrToAdd = prEntriesArr[i];
          sentBack = pSentBacks[oldproject];
        }
      }
    }
    
     
    //return if the row should not be editable
    var data = Session.get('editing-user-page');

    if (data) {
      if (oldproject !== data.project) {
        return;
      }
    } else if (submitted && !sentBack) {
      return;
    }

    if (oldproject === project) {
      entryArray2.splice(index2, 1);
      entryArray2.splice(index2, 0, {
        'hours': [Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday],
        'Comment': comment,
        'rowID': rowID
      });
      entryArrToAdd.EntryArray = entryArray2;
      prEntriesArr.splice(index1, 1);
      prEntriesArr.splice(index1, 0, entryArrToAdd);
      Meteor.call('updateTimesheetProjectEntriesArray', sheet._id, prEntriesArr);

    } else {
      //Project has been changed
      Meteor.call('removeRowInTimeSheet', date, user, rowID, project, Session.get('editing-user-page'));
      Meteor.call('addRowToTimeSheet', date, user, project, comment, Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, rowID, callback);
    }
  },

  updateGeneralCommentsInTimeSheet: function (date, user, gen_comment, callback) {
    /*
     Update comments and concerns seciton of an active timesheet.
     This should be called from an onBlur event.
     */
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    //make sure not updating when it shouldn't
    var data = Session.get('editing-user-page');
    var disable = data || (sheet.submitted && !TimeSheetService.checkSentBack());
    if (disable) {
      return;
    }
    TimeSheet.update({'_id': sheet._id},
        {
          $set: {
            'generalComment': gen_comment,
          }
        });
    // Meteor.call('updateGenComments', date, user, gen_comment, concerns, callback);
  },
  updateConcernsInTimeSheet: function (date, user, concerns, callback) {
    /*
     Update comments and concerns seciton of an active timesheet.
     This should be called from an onBlur event.
     */
    var sheet = TimeSheet.findOne({'startDate': date, 'userId': user});

    //make sure not updating when it shouldn't
    var data = Session.get('editing-user-page');
    var disable = data || (sheet.submitted && !TimeSheetService.checkSentBack());
    if (disable) {
      return;
    }
   TimeSheet.update({'_id': sheet._id},
        {
          $set: {
            'concerns': concerns
          }
        });
  }
};
var containsInArray = function(item, array){
    for(var i =0; i<array.length;i++){
      if(item === array[i]){
        return true;
      }
    }
    return false;
}