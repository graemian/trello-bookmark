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

            if (result.ogImage && result.ogImage.url)
              tabInfo.cover = result.ogImage.url;

            if (result.ogTitle)
              tabInfo.title = result.ogTitle;

            updateCard(client, tabInfo);

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