import { isChromeExtension, getTabInfo } from '../services/browser'
import { pathStrToArray, getDefaultPoster, loadOpenGraph } from '../services/utils'
import { GET_LOCATIONS } from '../services/queries'

export const defaultData = {
  settings: {
    __typename: "Settings",
    spinner: {
      type: "loading",
      isVisible: false,
      __typename: "Spinner"
    },
  },
  locations: [
    {id: 0, site: 'lastLocation', pathStr: '', __typename: "Location"},
    {id: 1, site: 'newTab', pathStr: '', __typename: "Location"}
  ],
  card: {
    __typename: "Card",
    position: "top",
    link: '',
    title: '',
    description: '',
    boardId: '',
    teamId: null,
    cover: '',
    listId: '',
    dueDate: '',
    dueTime: '12:00',
    labels: [],
    assignees: []
  }
}

const getFoundPath = (url, locations) => {
  const foundSite = locations
    .find(({ site }) => site && url.includes(site))
  const [ newTab ] = locations
    .filter(location => location.site === 'newTab')
  const [ lastLocation ] = locations
    .filter(location => location.site === 'lastLocation')

  if (url === '') {
    return pathStrToArray(newTab.pathStr)
  } else if (foundSite) {
    return pathStrToArray(foundSite.pathStr)
  } else if (lastLocation) {
    return pathStrToArray(lastLocation.pathStr)
  } else {
    return []
  }
}

const updateCard = (client, card) => {
  const { locations } = client.readQuery({ 
    query: GET_LOCATIONS
  })
  const foundedPath = getFoundPath(card.link, locations)
  if(foundedPath.length) {
    const [teamId, boardId, listId] = foundedPath
    client.writeData({ 
      data: {
        card: {
          ...card,
          teamId,
          boardId,
          listId,
          __typename: "Card",
        }
      }
    })
  } else {
    client.writeData({ 
      data: {
        card: {
          ...card,
          __typename: "Card",
        }
      }
    })
  }
}

// https://stackoverflow.com/a/18101796/1420157
function URLUtils(url, baseURL) {
  var m = String(url).replace(/^\s+|\s+$/g, "").match(/^([^:\/?#]+:)?(?:\/\/(?:([^:@\/?#]*)(?::([^:@\/?#]*))?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
  if (!m) {
    throw new RangeError();
  }
  var protocol = m[1] || "";
  var username = m[2] || "";
  var password = m[3] || "";
  var host = m[4] || "";
  var hostname = m[5] || "";
  var port = m[6] || "";
  var pathname = m[7] || "";
  var search = m[8] || "";
  var hash = m[9] || "";
  if (baseURL !== undefined) {
    var base = new URLUtils(baseURL);
    var flag = protocol === "" && host === "" && username === "";
    if (flag && pathname === "" && search === "") {
      search = base.search;
    }
    if (flag && pathname.charAt(0) !== "/") {
      pathname = (pathname !== "" ? (((base.host !== "" || base.username !== "") && base.pathname === "" ? "/" : "") + base.pathname.slice(0, base.pathname.lastIndexOf("/") + 1) + pathname) : base.pathname);
    }
    // dot segments removal
    var output = [];
    pathname.replace(/^(\.\.?(\/|$))+/, "")
        .replace(/\/(\.(\/|$))+/g, "/")
        .replace(/\/\.\.$/, "/../")
        .replace(/\/?[^\/]*/g, function (p) {
          if (p === "/..") {
            output.pop();
          } else {
            output.push(p);
          }
        });
    pathname = output.join("").replace(/^\//, pathname.charAt(0) === "/" ? "/" : "");
    if (flag) {
      port = base.port;
      hostname = base.hostname;
      host = base.host;
      password = base.password;
      username = base.username;
    }
    if (protocol === "") {
      protocol = base.protocol;
    }
  }
  this.origin = protocol + (protocol !== "" || host !== "" ? "//" : "") + host;
  this.href = protocol + (protocol !== "" || host !== "" ? "//" : "") + (username !== "" ? username + (password !== "" ? ":" + password : "") + "@" : "") + host + pathname + search + hash;
  this.protocol = protocol;
  this.username = username;
  this.password = password;
  this.host = host;
  this.hostname = hostname;
  this.port = port;
  this.pathname = pathname;
  this.search = search;
  this.hash = hash;
}

export default {
  init: client => {
    const storedData = localStorage.getItem("apollo-cache-persist")
    
    if(!storedData) {
      client.writeData({ data: defaultData })
    }
    
    if(isChromeExtension){
      getTabInfo(tabInfo => {

        tabInfo.cover = getDefaultPoster(tabInfo.link)

        if(tabInfo.link === 'chrome://newtab/') {
          updateCard(client, { title: "", link: "" })
        } else {      
          updateCard(client, tabInfo)
        }

        loadOpenGraph().then( result => {

          console.log("Result is " + result);

          if (result.success) {

            if (result.ogTitle)
              tabInfo.title = result.ogTitle;

            if (result.ogImage && result.ogImage.url) {

              const url = result.ogImage.url;

              var r = new RegExp('^(?:[a-z+]+:)?//', 'i');

              if (r.test( url )) {

                console.log("Full URL");

                tabInfo.cover = url;

                updateCard(client, tabInfo);

              } else {

                console.log("Partial URL");

                getTabInfo(i => {

                  if (url.startsWith("/")) {

                    const urlObj = new URL( i.link );

                    tabInfo.cover = urlObj.origin + url;

                  } else

                    tabInfo.cover = new URLUtils(url, i.link).href;

                  updateCard(client, tabInfo);

                });

              }

            }

          }

        });

      });

    } else {
      updateCard(client, {
        title: document.title,
        link: window.location.href
      })
    }
  }
} 