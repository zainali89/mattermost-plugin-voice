import {changeOpacity} from 'mattermost-redux/utils/theme_utils';

import './post_type.css';

const React = window.React;
const PropTypes = window.PropTypes;

function pad2(n) {
    const val = n | 0;
    return val < 10 ? `0${val}` : `${Math.min(val, 99)}`;
}

function formatTime(secs) {
    const total = Math.max(0, Math.round(secs || 0));
    const mins = Math.floor(total / 60);
    return `${mins}:${pad2(total % 60)}`;
}

export default class PostType extends React.PureComponent {
    static propTypes = {
        post: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        pluginURL: PropTypes.string.isRequired,
    }

    constructor(props) {
        super(props);
        const declaredDuration = props.post.props && props.post.props.duration ?
            props.post.props.duration / 1000 : 0;
        this.state = {
            currentTime: 0,
            duration: declaredDuration,
            playing: false,
            played: false,
            isDragging: false,
        };
        this.audioRef = React.createRef();
        this.scrubberRef = React.createRef();
    }

    componentDidMount() {
        const a = this.audioRef.current;
        if (!a) {
            return;
        }
        a.addEventListener('loadedmetadata', () => {
            if (a.duration && isFinite(a.duration)) {
                this.setState({duration: a.duration});
            }
        });
        a.addEventListener('timeupdate', () => {
            if (!this.state.isDragging) {
                this.setState({currentTime: a.currentTime});
            }
        });
        a.addEventListener('play', () => this.setState({playing: true, played: true}));
        a.addEventListener('pause', () => this.setState({playing: false}));
        a.addEventListener('ended', () => this.setState({playing: false, played: false, currentTime: 0}));
        window.addEventListener('mousemove', this.onScrubMove);
        window.addEventListener('mouseup', this.onScrubEnd);
        window.addEventListener('touchmove', this.onTouchMove, {passive: false});
        window.addEventListener('touchend', this.onScrubEnd);
    }

    componentWillUnmount() {
        window.removeEventListener('mousemove', this.onScrubMove);
        window.removeEventListener('mouseup', this.onScrubEnd);
        window.removeEventListener('touchmove', this.onTouchMove);
        window.removeEventListener('touchend', this.onScrubEnd);
    }

    togglePlay = () => {
        const a = this.audioRef.current;
        if (!a) {
            return;
        }
        if (a.paused) {
            a.play();
        } else {
            a.pause();
        }
    }

    seekFromClientX = (clientX) => {
        if (!this.scrubberRef.current || !this.audioRef.current) {
            return;
        }
        const rect = this.scrubberRef.current.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const time = ratio * (this.state.duration || 0);
        this.audioRef.current.currentTime = time;
        this.setState({currentTime: time});
    }

    onScrubStart = (e) => {
        e.preventDefault();
        this.setState({isDragging: true});
        this.seekFromClientX(e.clientX);
    }

    onScrubMove = (e) => {
        if (!this.state.isDragging) {
            return;
        }
        this.seekFromClientX(e.clientX);
    }

    onTouchStart = (e) => {
        e.preventDefault();
        this.setState({isDragging: true});
        if (e.touches && e.touches[0]) {
            this.seekFromClientX(e.touches[0].clientX);
        }
    }

    onTouchMove = (e) => {
        if (!this.state.isDragging) {
            return;
        }
        if (e.touches && e.touches[0]) {
            e.preventDefault();
            this.seekFromClientX(e.touches[0].clientX);
        }
    }

    onScrubEnd = () => {
        if (this.state.isDragging) {
            this.setState({isDragging: false});
        }
    }

    render() {
        const {post, theme, pluginURL} = this.props;
        const audioSrc = `${pluginURL}/recordings/${post.id}`;
        const duration = this.state.duration;
        const progress = duration > 0 ? (this.state.currentTime / duration) * 100 : 0;

        // Show current time once playback has started; otherwise show the
        // total duration so the user knows how long the message is.
        const timeShown = this.state.played || this.state.currentTime > 0 ?
            formatTime(this.state.currentTime) : formatTime(duration);

        const accent = theme.buttonBg || theme.linkColor;
        const accentText = theme.buttonColor || '#ffffff';
        const trackBg = changeOpacity(theme.centerChannelColor, 0.12);
        const muted = changeOpacity(theme.centerChannelColor, 0.56);
        const borderColor = changeOpacity(theme.centerChannelColor, 0.16);

        return (
            <div
                className='vp-wrapper'
                style={{borderColor, background: theme.centerChannelBg}}
            >
                <button
                    type='button'
                    className='vp-playbtn'
                    onClick={this.togglePlay}
                    style={{background: changeOpacity(accent, 0.14), color: accent}}
                    aria-label={this.state.playing ? 'Pause' : 'Play'}
                >
                    <i className={this.state.playing ? 'fa fa-pause' : 'fa fa-play'}/>
                </button>
                <div
                    ref={this.scrubberRef}
                    className='vp-scrubber'
                    onMouseDown={this.onScrubStart}
                    onTouchStart={this.onTouchStart}
                    role='slider'
                    aria-valuemin='0'
                    aria-valuemax={duration || 0}
                    aria-valuenow={this.state.currentTime}
                    tabIndex='0'
                >
                    <div
                        className='vp-scrubber-track'
                        style={{background: trackBg}}
                    />
                    <div
                        className='vp-scrubber-fill'
                        style={{width: `${progress}%`, background: accent}}
                    />
                    <div
                        className='vp-scrubber-thumb'
                        style={{left: `${progress}%`, background: accent, boxShadow: `0 0 0 4px ${changeOpacity(accent, 0.18)}`}}
                    />
                </div>
                <span
                    className='vp-duration'
                    style={{color: muted}}
                >
                    {timeShown}
                </span>
                <a
                    className='vp-download'
                    href={audioSrc}
                    download
                    style={{color: muted}}
                    aria-label='Download voice message'
                >
                    <i className='fa fa-download'/>
                </a>
                <audio
                    ref={this.audioRef}
                    preload='metadata'
                    src={audioSrc}
                />
                {/* accentText referenced to keep the linter happy when consumers
                    later want the filled variant. */}
                <span style={{display: 'none', color: accentText}}/>
            </div>
        );
    }
}