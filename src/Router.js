import React from 'react';
import { ViewPropTypes, BackHandler, Linking } from 'react-native';
import PropTypes from 'prop-types';
import navigationStore from './navigationStore';
import pathParser from './pathParser';

class App extends React.Component {
  static propTypes = {
    navigator: PropTypes.func,
    backAndroidHandler: PropTypes.func,
    uriPrefix: PropTypes.string,
    onDeepLink: PropTypes.func,
    navigationStore: PropTypes.object
  };

  static defaultProps = {
    navigator: null,
    backAndroidHandler: null,
    uriPrefix: null,
    onDeepLink: null,
    navigationStore: navigationStore
  };

  constructor(props) {
    super(props);
    this.navigationStore = props.navigationStore;
  }

  componentDidMount() {
    BackHandler.addEventListener('hardwareBackPress', this.props.backAndroidHandler || this.onBackPress);

    // If the app was "woken up" by an external route.
    Linking.getInitialURL().then(url => this.parseDeepURL(url));
    // Add an event listener for further deep linking.
    Linking.addEventListener('url', this.handleDeepURL);
  }

  componentWillUnmount() {
    BackHandler.removeEventListener('hardwareBackPress', this.props.backAndroidHandler || this.onBackPress);
    Linking.removeEventListener('url', this.handleDeepURL);
  }

  onBackPress = () => this.navigationStore.pop();

  handleDeepURL = e => this.parseDeepURL(e.url);

  parseDeepURL = (url) => {
    // If there is no url, then return.
    if (!url) {
      return;
    }

    // Clean the url with the given prefix.
    const cleanUrl = this.props.uriPrefix ? url.split(this.props.uriPrefix)[1] : url;
    // Skip for uriPrefix which not registered
    if (!cleanUrl) {
      return;
    }
    // Build an array of paths for every scene.
    const allPaths = Object.values(this.navigationStore.states)
      .map(obj => obj.path)
      .filter(path => path);
    // Try to match the url against the set of paths and parse the url parameters.
    const parsedPath = pathParser(cleanUrl, allPaths);

    // If the url could not be matched, then return.
    if (!parsedPath) {
      return;
    }

    // Destructure the matched path and the parsed url parameters.
    const { path, params } = parsedPath;

    // Get the action from the scene associated with the matched path.
    const actionKey = Object.entries(this.navigationStore.states)
      .filter(([, value]) => value.path === path)
      .map(([key]) => key)
      .find(key => key);

    if (this.props.onDeepLink) {
      this.props.onDeepLink({ url, action: actionKey, params });
    } else if (actionKey && this.navigationStore[actionKey]) {
      // Call the action associated with the scene's path with the parsed parameters.
      this.navigationStore[actionKey](params);
    }
  };

  render() {
    const { dispatch, state, navigator: AppNavigator } = this.props;
    if (dispatch && state) {
      this.navigationStore.externalDispatch = dispatch;
      this.navigationStore.externalState = state;
      return (
        <AppNavigator
          dispatch={this.navigationStore.dispatch}
          state={this.navigationStore.state}
          ref={(navigatorRef) => {
            this.navigationStore.setTopLevelNavigator(navigatorRef);
          }}
        />
      );
    }
    return (
      <AppNavigator
        onNavigationStateChange={this.navigationStore.onNavigationStateChange}
        ref={(navigatorRef) => {
          this.navigationStore.setTopLevelNavigator(navigatorRef);
        }}
      />
    );
  }
}

const Router = ({
  createReducer, sceneStyle, onStateChange, scenes, uriPrefix, navigator, getSceneStyle, children, onDeepLink, wrapBy, navigationStore, ...props
}) => {
  const data = { ...props };
  if (getSceneStyle) {
    data.cardStyle = getSceneStyle(props);
  }
  if (sceneStyle) {
    data.cardStyle = sceneStyle;
  }
  const AppNavigator = scenes || navigator || navigationStore.create(children, data, wrapBy);
  navigationStore.reducer = createReducer && createReducer(props);
  if (onStateChange) {
    navigationStore.onStateChange = onStateChange;
  }
  return <App {...props} onDeepLink={onDeepLink} navigator={AppNavigator} uriPrefix={uriPrefix} navigationStore={navigationStore} />;
};
Router.propTypes = {
  onStateChange: PropTypes.func,
  scenes: PropTypes.func,
  navigator: PropTypes.func,
  wrapBy: PropTypes.func,
  getSceneStyle: PropTypes.func,
  sceneStyle: ViewPropTypes.style,
  createReducer: PropTypes.func,
  children: PropTypes.element,
  uriPrefix: PropTypes.string,
  onDeepLink: PropTypes.func,
  navigationStore: PropTypes.object,
};
Router.defaultProps = {
  onStateChange: null,
  scenes: null,
  navigator: null,
  wrapBy: props => props,
  getSceneStyle: null,
  sceneStyle: null,
  children: null,
  uriPrefix: null,
  onDeepLink: null,
  navigationStore: navigationStore,
};

export default Router;
