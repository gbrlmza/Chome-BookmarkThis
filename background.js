/**********************************************************************************************************************
 * Manage bookmarks
 *********************************************************************************************************************/
var Bookmark = {

	bookmarkBaseName : '### Saved Bookmarks',

	/**
	 * Get the root folder to store bookmarks, create if non-existent
	 */
	get : function (callback) {
		var self = this;
		var bookmarkBase = null;

		chrome.bookmarks.getTree(function (tree) {
			self.createPath(tree[0].children[1], self.bookmarkBaseName, function(folder){
				callback(folder);
			});
		})
	},

	/**
	 * save bookmark under the given path
	 */
	save: function (tab, path, callback) {
		var self = this;
		self.get(function(base){
			self.createPath(base, path, function(folder){
				var exists = false;
				if (!folder.hasOwnProperty('children')) folder.children = [];
				for (i=0, imax=folder.children.length; i < imax; i++) {
					if (folder.children[i].title == tab.title && folder.children[i].url == tab.url) {
						exists = true;
						break;
					}
				}

				if (!exists) {
					chrome.bookmarks.create({
						'parentId' : folder.id,
						'title' : tab.title,
						'url' : tab.url
					}, function() {
						callback(true);
					});
				} else {
					callback(false);
				}
			});
		});
	},

	/**
	 *Create path to save bookmark
	 */
	createPath: function(base, path, callback) {
		var self = this;
		var c , folder, folders = path.split("/");

		if(path == "") { callback(base); return; }
		folder = folders.shift();

		if (base.hasOwnProperty('children')) {
			for (i=0, imax=base.children.length; i < imax; i++) {
				c = base.children[i];
				if (c.hasOwnProperty('children') && c.title == folder) {
					self.createPath(c, folders.join("/"), function(folder){
						callback(folder);
					});
					return;
				}
			}
		}

		chrome.bookmarks.create({
			'parentId' : base.id,
			'title' : folder
		}, function (newFolder) {
			self.createPath(newFolder, folders.join("/"), function(folder){
				callback(folder);
			});
			return;
		});
	}

};

/**********************************************************************************************************************
 * Called when the user clicks on the browser action.
 *********************************************************************************************************************/
chrome.browserAction.onClicked.addListener(function(tab) {

	chrome.bookmarks.getTree(function(tree){
		var bookmarks = tree[0].children[1].children;
		var otherBookmarksID = tree[0].children[1].id;
		
		var path = buildPath();
		Bookmark.save(tab, path, function(created){
			if (created) {
				// Show OK Badge
				chrome.browserAction.setBadgeBackgroundColor({'color':[52,200,0,255]});
				chrome.browserAction.setBadgeText({'text':'+'});
			} else {
				// Show Warning Badge. Existent bookmark
				chrome.browserAction.setBadgeBackgroundColor({'color':[240,240,0,255]});
				chrome.browserAction.setBadgeText({'text':'!'});
			}

			// Remove badge after a delay
			setTimeout(function(){
				chrome.browserAction.setBadgeText({'text': ''});
			},500);

			// Also save for quick access
			Bookmark.save(tab, "", function(){});
		});
	});

	function buildPath() {
		var path = "";
		var now = new Date();
		var day = now.getDate();
		var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

		// {Year}/{Month Name}/{Day Group}
		path += now.getFullYear() + "/";
		path += monthNames[now.getMonth()] + "/";
		path += "Day " + (day <= 10 ? "1-10" : day <= 20 ? "11-20" : "21-" + new Date(now.getFullYear(),now.getMonth(),0).getDate());

		return path;
	};
	
});

// Set aup alarm for clenup proccess
chrome.alarms.create("CLEAN", {delayInMinutes: 1, periodInMinutes: 1440}); // Every 24Hs

/**********************************************************************************************************************
 * Handle alarms
 *********************************************************************************************************************/
chrome.alarms.onAlarm.addListener(function(alarm){
	Bookmark.get(function(folder){
		if (!folder.hasOwnProperty('children')) folder.children = [];

		for (i=0, imax=folder.children.length; i < imax; i++) {
			// if link(not folder) and older than 7 days delete bookmark
			if ( folder.children[i].url && (Date.now() - folder.children[i].dateAdded) > (60*60*24*7*1000) ) {
				chrome.bookmarks.remove(c.id, function () {});
			}
		}
	});
});
