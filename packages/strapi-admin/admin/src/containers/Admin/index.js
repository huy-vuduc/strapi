/**
 *
 * Admin
 *
 */

import React from 'react';
import ReactGA from 'react-ga';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import { Switch, Route } from 'react-router-dom';

// Actions from strapi-helper-plugin
// Actions required for disabling and enabling the OverlayBlocker
import {
  disableGlobalOverlayBlocker,
  enableGlobalOverlayBlocker,
} from 'actions/overlayBlocker';

// Components from strapi-helper-plugin
import LoadingIndicatorPage from 'components/LoadingIndicatorPage';
import OverlayBlocker from 'components/OverlayBlocker';

import injectHooks from 'utils/injectHooks';

import Header from '../../components/Header/index';

import ComingSoonPage from '../ComingSoonPage';
import LeftMenu from '../LeftMenu';
import LocaleToggle from '../LocaleToggle';
import HomePage from '../HomePage/Loadable';
import Marketplace from '../Marketplace/Loadable';
import ListPluginsPage from '../ListPluginsPage/Loadable';
import NotFoundPage from '../NotFoundPage/Loadable';
import PluginDispatcher from '../PluginDispatcher';

import { updatePlugin } from '../App/actions';
import makeSelecApp from '../App/selectors';

import injectSaga from '../../utils/injectSaga';
import injectReducer from '../../utils/injectReducer';

import localeToggleReducer from '../LocaleToggle/reducer';
import {
  resetLocaleDefaultClassName,
  setLocaleCustomClassName,
} from '../LocaleToggle/actions';

import {
  getInitData,
  hideLeftMenu,
  setAppError,
  showLeftMenu,
} from './actions';
import makeSelectAdmin from './selectors';
import reducer from './reducer';
import saga from './saga';

import NavTopRightWrapper from './NavTopRightWrapper';

import styles from './styles.scss';

export class Admin extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { shouldSecureAfterAllPluginsAreMounted: true };

  getChildContext = () => ({
    disableGlobalOverlayBlocker: this.props.disableGlobalOverlayBlocker,
    enableGlobalOverlayBlocker: this.props.enableGlobalOverlayBlocker,
    plugins: this.props.global.plugins,
    updatePlugin: this.props.updatePlugin,
  });

  componentDidMount() {
    // Initialize Google Analytics
    // Refer to ../../../doc/disable-tracking.md for more informations
    /* istanbul ignore next */
    ReactGA.initialize(
      'UA-54313258-9',
      { testMode: process.env.NODE_ENV === 'test' },
    );

    // Retrieve the main settings of the application
    this.props.getInitData();
  }

  componentDidUpdate(prevProps) {
    const {
      admin: { isLoading },
      location: { pathname },
    } = this.props;

    if (!isLoading && this.state.shouldSecureAfterAllPluginsAreMounted) {
      if (!this.hasApluginNotReady(this.props)) {
        this.props.getHook('willSecure');
      }
    }

    if (prevProps.location.pathname !== pathname) {
      this.props.getHook('willSecure');

      /* istanbul ignore if */
      if (this.isAcceptingTracking()) {
        ReactGA.pageview(
          pathname,
          { testMode: process.env.NODE_ENV === 'test' },
        );
      }
    }
  }

  /* istanbul ignore next */
  componentDidCatch(error, info) {
    /* eslint-disable */
    console.log('An error has occured');
    console.log('--------------------');
    console.log(error);
    console.log('Here is some infos');
    console.log(info);
    /* eslint-enable */

    // Display the error log component which is not designed yet
    this.props.setAppError();
  }

  getContentWrapperStyle = () => {
    const { admin: { showMenu } } = this.props;

    return showMenu
      ? { main: {}, sub: styles.content }
      : { main: { width: '100%' }, sub: styles.wrapper };
  }

  hasApluginNotReady = props => {
    const { global: { plugins } } = props;

    return !Object.keys(plugins).every(plugin => (plugins[plugin].isReady === true));
  } 

  helpers = {
    hideLeftMenu: this.props.hideLeftMenu,
    showLeftMenu: this.props.showLeftMenu,
    updatePlugin: this.props.updatePlugin,
  };

  isAcceptingTracking = () => {
    const { admin: { uuid } } = this.props;

    return !!uuid;
  }

  /**
   * Display the app loader until the app is ready
   * @returns {Boolean}
   */
  showLoader = () => {
    const {
      admin: { isLoading },
      global: { isAppLoading },
    } = this.props;

    if (isAppLoading) {
      return true;
    }

    if (isLoading) {
      return true;
    }

    return this.hasApluginNotReady(this.props);
  }

  renderInitializers = () => {
    const {
      global: { plugins },
    } = this.props;

    return Object.keys(plugins).reduce((acc, current) => {
      const Compo = plugins[current].initializer;
      const key = plugins[current].id;

      if (Compo) {
        // We don't check if the initializer is correct because there's a fallback in cdc
        acc.push(<Compo key={key} {...this.props} {...this.helpers} />);
      }

      return acc;
    }, []);
  };

  renderMarketPlace = props => <Marketplace {...props} {...this.props} />;

  renderPluginDispatcher = props => {
    // NOTE: Send the needed props instead of everything...

    return <PluginDispatcher {...this.props} {...props} {...this.helpers} />;
  }

  render() {
    const {
      admin: {
        appError,
        isLoading,
        layout,
        showMenu,
        strapiVersion,
      },
      global: {
        blockApp,
        overlayBlockerData,
        plugins,
        showGlobalAppBlocker,
      },
    } = this.props;

    if (appError) {
      return <div>An error has occured please check your logs</div>;
    }

    if (isLoading) {
      return <LoadingIndicatorPage />;
    }

    // We need the admin data in order to make the initializers work
    if (this.showLoader()) {
      return (
        <React.Fragment>
          {this.renderInitializers()}
          <LoadingIndicatorPage />
        </React.Fragment>
      );
    }

    return (
      <div className={styles.adminPage}>
        {showMenu  && (
          <LeftMenu
            layout={layout}
            version={strapiVersion}
            plugins={plugins}
          />
        )}
        <NavTopRightWrapper>
          <LocaleToggle isLogged />
        </NavTopRightWrapper>
        <div className={styles.adminPageRightWrapper} style={this.getContentWrapperStyle().main}>
          {showMenu ? <Header /> : ''}
          <div className={this.getContentWrapperStyle().sub}>
            <Switch>
              <Route key="1" path="/" component={HomePage} exact />
              <Route key="2" path="/plugins/:pluginId" render={this.renderPluginDispatcher} />
              <Route key="3" path="/plugins" component={ComingSoonPage} />
              <Route key="4" path="/list-plugins" component={ListPluginsPage} exact />
              <Route key="5" path="/marketplace" render={this.renderMarketPlace} exact />
              <Route key="6" path="/configuration" component={ComingSoonPage} exact />
              <Route key="7" path="" component={NotFoundPage} />
              <Route key="8" path="404" component={NotFoundPage} />
            </Switch>
          </div>
        </div>
        <OverlayBlocker
          key="overlayBlocker"
          isOpen={blockApp && showGlobalAppBlocker}
          {...overlayBlockerData}
        />
      </div>
    );
  }
}

Admin.childContextTypes = {
  disableGlobalOverlayBlocker: PropTypes.func,
  enableGlobalOverlayBlocker: PropTypes.func,
  plugins: PropTypes.object,
  updatePlugin: PropTypes.func,
};

Admin.propTypes = {
  admin: PropTypes.shape({
    autoReload: PropTypes.bool,
    appError: PropTypes.bool,
    currentEnvironment: PropTypes.string,
    isLoading: PropTypes.bool,
    layout: PropTypes.object,
    showMenu: PropTypes.bool,
    strapiVersion: PropTypes.string,
    uuid: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.string,
    ]),
  }).isRequired,
  disableGlobalOverlayBlocker: PropTypes.func.isRequired,
  enableGlobalOverlayBlocker: PropTypes.func.isRequired,
  getHook: PropTypes.func.isRequired,
  getInitData: PropTypes.func.isRequired,
  global: PropTypes.shape({
    appPlugins: PropTypes.array,
    blockApp: PropTypes.bool,
    overlayBlockerData: PropTypes.object,
    isAppLoading: PropTypes.bool,
    plugins: PropTypes.object,
    showGlobalAppBlocker: PropTypes.bool,
  }).isRequired,
  hideLeftMenu: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  resetLocaleDefaultClassName: PropTypes.func.isRequired,
  setAppError: PropTypes.func.isRequired,
  showLeftMenu: PropTypes.func.isRequired,
  updatePlugin: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  admin: makeSelectAdmin(),
  global: makeSelecApp(),
});

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      disableGlobalOverlayBlocker,
      enableGlobalOverlayBlocker,
      getInitData,
      hideLeftMenu,
      resetLocaleDefaultClassName,
      setAppError,
      setLocaleCustomClassName,
      showLeftMenu,
      updatePlugin,
    },
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = injectReducer({ key: 'admin', reducer });
const withSaga = injectSaga({ key: 'admin', saga });
const withLocaleToggleReducer = injectReducer({ key: 'localeToggle', reducer: localeToggleReducer });
const withHooks = injectHooks({ key: 'admin' });

export default compose(
  withReducer,
  withLocaleToggleReducer,
  withSaga,
  withConnect,
  withHooks,
)(Admin);