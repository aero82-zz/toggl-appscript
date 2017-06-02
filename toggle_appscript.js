/** Search for first empty row and append new data */
function writeData(output) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetout = ss.getSheetByName('Log');
  var daterange = sheetout.getRange("A1:A100");
  var data = daterange.getValues();
  var i = 0;
  var keepGoing = true;
  
  while (keepGoing) {
    if (data[i][0] == '') {
      row = i;
      keepGoing = false;
    } else if (i == data.length) {
      keepGoing = false;
      Logger.log('Failed to find empty row');
    } else {
      i++;
    }
  }
  
  var outrange = sheetout.getRange(row+1, 1, 1, 6);
  outrange.setValues([output]); 
}

/** Convert current date to format used by Toggl API */
var transformDate = function (date, amount) {
    var tmpDate = new Date(date);
    tmpDate.setDate(tmpDate.getDate() + amount)
    return Utilities.formatDate(tmpDate, 'MT', 'yyyy-MM-dd');
};

/**
 * App Script trigger wrapper to make it easier to process
 * arbitary dates
 */
function processYesterday() {
  togglAPI(1);
}

/** Connect to Toggle account and download workspace and project info */
function togglAPI(daysAgo) {
  var baseURL = 'https://www.toggl.com';
  var userToken = 'FOO'; //Insert API token here
  var string = userToken +':api_token'
  var headers = {'Authorization':'Basic ' + Utilities.base64Encode(string)}
  var options = {'headers': headers};
  var response = UrlFetchApp.fetch(baseURL + '/api/v8/me', options);
  
  if (response.getResponseCode() != 200) {
    Logger.log('API request failed');
  }
  
  var res = JSON.parse(response);
  var email = 'aerofalor%40gmail.com';
  var workspaces = res['data']['workspaces'];
  var workspaceId = workspaces[0]['id']; // Assumes single workspace only
  
  var params = '?user_agent=' + email + '&workspace_id=' + workspaceId.toString()
  var projectURL = baseURL + '/api/v8/workspaces/' + workspaceId.toString() + '/projects' + params
  var projects = JSON.parse(UrlFetchApp.fetch(projectURL, options));
  
  var currentDate = new Date();
  var startDate = transformDate(currentDate, -1 * daysAgo);
  var endDate = transformDate(currentDate, -1 * (daysAgo-1));
  
  Logger.log(startDate + ',' + endDate);
  
  var params = '?user_agent=' + email + '&workspace_id=' + workspaceId.toString() + '&since=' + startDate + '&until=' + endDate;
  var reportURL = baseURL + '/reports/api/v2/summary' + params;
  var report = JSON.parse(UrlFetchApp.fetch(reportURL, options));
  
  var data = {};
  
  report['data'].forEach(function(project) {
    data[project['title']['project']] = project['time']/3600000;
  })
  
  // List of projects you care about exporting for your report in column order
  var allProjects = ['Work','Self Improvement','Chores','Health and Wellness','Wasted Time'];
  var output = [startDate]
  
  // Convert time values to fixed decimal place
  allProjects.forEach(function(proj) {
    if (data[proj]) {
      output.push(data[proj].toFixed(2))
    } else {
      output.push(0);
    };
  })
  
  writeData(output);
  
}
