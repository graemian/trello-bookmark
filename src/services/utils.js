import moment from 'moment'
import qs from 'qs'

export const validateLastLocation = (card, locationTree) => {
  const { teamId, boardId, listId } = card
  const isTeamValid = locationTree
    .some(team => team.id === teamId)

  if(!isTeamValid) return false

  const isBoardValid = locationTree
    .find(team => team.id === teamId)
    .children
    .some(board => board.id === boardId)

  if(!isBoardValid) return false

  const isListValid = locationTree
    .find(team => team.id === teamId)
    .children
    .find(board => board.id === boardId)
    .children
    .some(list => list.id === listId)

  if(!isListValid) return false
  return true
}

export const objectWithoutKey = (object, key) => {
  const {[key]: deletedKey, ...otherKeys} = object
  return otherKeys
}

export const pathStrToArray = path => {
  if(path) {
    const [teamId, boardId, listId] = path.split('/')
    return teamId === "null" ? [null, boardId, listId] : [teamId, boardId, listId]
  } else {
    return []
  }
}

export const pathArrayToStr = path => {
  if(path.length && path.length === 3) {
    const [ teamId, boardId, listId ] = path
    return `${teamId}/${boardId}/${listId}`
  } else {
    return ''
  }
}

export const normalizeLocationTree = ({ teams, boards }) => [{
  id: null,
  displayName: "Private"
}, ...teams].map(team => ({
  ...team,
  name: team.displayName,
  children: boards
    .filter(board => board.idOrganization === team.id)
    .map(board => ({
      ...board,
      children: board.lists
    }))
}))




export const resolveSubmitParams = card => qs.stringify({
  name: card.title,
  desc: card.description,
  pos: card.position,
  due: card.dueDate && moment(
    `${card.dueDate} ${card.dueTime}`,
    "DD.MM.YYYY HH:mm"
  ).toISOString(),
  idLabels: card.labels.join(','),
  idMembers: card.assignees.join(','),
  idList: card.listId
})

export const hexColor = {
  black: "#355263",
  blue: "#0079bf",
  green: "#61bd4f",
  lime: "#51e898",
  orange: "#ff9f1a",
  pink: "#ff78cb",
  purple: "#c377e0",
  red: "#eb5a46",
  sky: "#00c2e0",
  yellow: "#f2d600"
}

export const getImageSrc = (e, callback) => {
  const {clipboardData: { items }} = e;

  [...items].map(item => {
    if (item.kind === 'file') {
      const blob = item.getAsFile()
      const reader = new FileReader()
      reader.onload = e => {
        const imageSrc = e.target.result
        if(/base64/.test(imageSrc)) {
          callback(imageSrc)
        }
      }
      reader.readAsDataURL(blob)
    }
    return ""
  })
}

export const generateBlob = imageData => {
  var imageDataElements = imageData.split(','),
    mimeType = imageDataElements[0].split(':')[1].split(';')[0],
    imageB64Data = imageDataElements[1],
    byteString = atob(imageB64Data),
    length = byteString.length,
    ab = new ArrayBuffer(length),
    ua = new Uint8Array(ab),
    i

  for (i = 0; i < length; i++) {
      ua[i] = byteString.charCodeAt(i)
  }

  return new Blob([ab], { type: mimeType })
}

export const getHostname = url => {
  const a = document.createElement('a')
  a.href = url
  return a.hostname
}

export const getDefaultPoster = url => {
  const siteRules = {
    'youtube.com': () => {
      const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/ // eslint-disable-line
      const match = url.match(regExp)
      if (match && match[2].length === 11) {
        return `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`
      } else {
        return ''
      }
    }
  }

  const foundSite = Object.keys(siteRules).find(site => getHostname(url).includes(site))

  if(foundSite) {
    return siteRules[foundSite]()
  }
  return ''
}

let pageSourcePromiseResolve;

const pageSourcePromise = new Promise((resolve, reject) => {

  pageSourcePromiseResolve = resolve;

});

// https://stackoverflow.com/a/11696154/1420157
chrome.runtime.onMessage.addListener(function(request, sender) {
  if (request.action == "getSource") {

    console.log("Got page source:" + request.source);

    pageSourcePromiseResolve( request.source );

  }
});

/* global chrome */

function onWindowLoad() {

  console.log("onWindowLoad");

  chrome.tabs.executeScript(null, {
    file: "getPagesSource.js"
  }, function() {
    // If you try and inject into an extensions page or the webstore/NTP you'll get an error
    if (chrome.runtime.lastError) {
      console.log( chrome.runtime.lastError.message );
    }
  });

}

window.onload = onWindowLoad;

const ogs = require("open-graph-scraper-lite");

export function loadOpenGraph() {

  return pageSourcePromise.then( pageSource => {

    console.log("loadOpenGraph with HTML: " + pageSource);

    const options = {html: pageSource};

    return ogs(options).then(data => {

      const {error, result, response} = data;

      console.log('error:', error);  // This returns true or false. True if there was an error. The error itself is inside the results object.
      console.log('result:', result); // This contains all of the Open Graph results
      console.log('response:', response); // This contains the HTML of page

      return result;

    });

  });

}

