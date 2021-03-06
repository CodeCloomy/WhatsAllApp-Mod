import React, {Component} from 'react'
import styled from 'styled-components'
import NavBar  from './NavBar'
import {Container } from 'reactstrap'
import InputPanel from "./InputPanel"
import ResultsPanel from "./ResultsPanel"
import L from '../utils/Log'
import { getApi } from '../utils/WWapApi'
import demoAccounts from '../utils/demoAccounts'


const StyledContainer = styled.div`
  background-color: white;
  width: 100%;
  height: 0;
  transition: height 1.5s ease-in-out;
  overflow: auto;
  user-select: text;
  &.open {
    height: 100vh; 
  }
  
`

const Content = styled.div`
  margin: 0 0 150px 0;
  
`
class MainContent extends Component {

    constructor(props){
        super(props)
        this.state = {
            hydraterFastId: -1,
            hydraterSlowId: -1,
            staleAccountsId: -1,
            accounts: props.demoMode ? demoAccounts : []
        }

        this.staleAccounts = []

        this.setStaleAccounts = this.setStaleAccounts.bind(this)
        this.startStaleAccountsSync = this.startStaleAccountsSync.bind(this)
        this.setupPhoneNumbers = this.setupPhoneNumbers.bind(this)
        this.subscribeToPresence = this.subscribeToPresence.bind(this)
        this.startWappHydrater = this.startWappHydrater.bind(this)
        this.stopWappHydrater = this.stopWappHydrater.bind(this)  



    }

    setStaleAccounts(accounts) {
        this.staleAccounts = accounts
    }

    componentDidMount() {
        if (!this.props.demoMode) {
            this.startStaleAccountsSync()
            this.startWappHydrater()
        }

    }

    componentWillUnmount() {
        this.stopStaleAccountsSync()
        this.stopWappHydrater()

    }

    startStaleAccountsSync() {
        const staleAccountSync = () => {
            L('Doing stale account sync')
            if (this.staleAccounts.length > 0) {
                this.setState({accounts: this.staleAccounts})
            }
        }
        const staleAccountsId = setInterval(staleAccountSync, 3000)
        this.setState({staleAccountsId: staleAccountsId})
        staleAccountSync()
    }

    stopStaleAccountsSync() {
        L('Stopping stale account sync')
        clearInterval(this.state.staleAccountsId)

    }

    startWappHydrater() {
        L(`Killing previous WAPP hydraters if any`)
        this.stopWappHydrater()

        L(`Starting WAPP hydraters`)
        // Attributes to check every 10s
        const hydraterFast = () => {
            L('Hydrating 10s')
            let hydratedAccounts = []

            this.state.accounts.forEach((origAccount) => {
                const account = origAccount

                // 1. Online status
                const model = getApi().WLAPStore.Presence.models
                    .find((x) => x.__x_id.user === account.phoneNr.toString())
                if (model && model.isOnline) {
                    //let url = "sequential-ptt-end_62ed28be622237546fd39f9468a76a49.mp3"
                    let url = "sequential-ptt-middle_7fa161964e93db72b8d00ae22189d75f.mp3"
                    //let url = chrome.runtime.getURL("/note.mp3")
                    //console.log(account)
                    var audio = new Audio(url)
                    L(account.phoneNr + ' is online')
                    //audio.play()

                    function show() {
                        var no = account.phoneNr;
                        var name = account.displayName;
                        var lastseen = account.lastSeen;
                        //var time = /(..)(:..)/.exec(new Date());     // The prettyprinted time.
                        //var hour = time[1] % 12 || 12;               // The prettyprinted hour.
                        //var period = time[1] < 12 ? 'a.m.' : 'p.m.'; // The period of the day.
                        new Notification( "No.: "+ no + " Name: " + name, {
                            icon: 'img/intro-connection_c98cc75f2aa905314d74375a975d2cf2.jpg',
                            body: 'is online at ' + lastseen
                        });
                    }
                    show()

                    account.lastSeen = new Date()
                }
                hydratedAccounts.push(account)
            })
            this.setStaleAccounts(hydratedAccounts)

        } //0653109400
        const hydraterFastId = setInterval(hydraterFast, 10750)
        hydraterFast()

        // Attributes to check every 3600s
        const hydraterSlow = () => {
            L('Hydrating 3600s')
            this.state.accounts.forEach((origAccount) => {
                const account = origAccount

                // 1. Profile picture
                const profilePicFind = () => {
                    const hydratedAccounts = this.state.accounts
                    const index = hydratedAccounts.findIndex((stateAcc) => stateAcc.phoneNr === account.phoneNr)
                    getApi().WLAPStore.ProfilePicThumb.find(account.phoneNr + '@c.us').then((response) => {
                        hydratedAccounts[index].photoUrl = response.imgFull
                        this.setStaleAccounts(hydratedAccounts)
                    }, (response) => {
                        hydratedAccounts[index].photoUrl = response.model.eurl
                        this.setStaleAccounts(hydratedAccounts)
                    })
                }
                profilePicFind()

                // 2. Status text
                const statusFind = () => {
                    getApi().WLAPWAPStore.statusFind(account.phoneNr + '@c.us').then((response) => {
                        const hydratedAccounts = this.state.accounts
                        const index = hydratedAccounts.findIndex((stateAcc) => stateAcc.phoneNr === account.phoneNr)
                        hydratedAccounts[index].statusTxt = response.status
                        if (response.status === 429) {
                            L('Server is throttling status texts, trying again in 60s')
                        } else {
                            this.setStaleAccounts(hydratedAccounts)
                        }

                    })
                }
                statusFind()

                // 3. Name
                const displayNameFind = () => {
                    getApi().WLAPStore.Contact.find(account.phoneNr + '@c.us').then((response) => {
                        const hydratedAccounts = this.state.accounts
                        const index = hydratedAccounts.findIndex((stateAcc) => stateAcc.phoneNr === account.phoneNr)
                        hydratedAccounts[index].displayName = response.isMyContact ? response.formattedName : undefined
                        this.setStaleAccounts(hydratedAccounts)
                    })
                }
                displayNameFind()
            })
        }
        const hydraterSlowId = setInterval(hydraterSlow, 3600000)
        hydraterSlow()


        this.setState({
            hydraterFastId: hydraterFastId,
            hydraterSlowId: hydraterSlowId
        })
    }

    stopWappHydrater() {
        L(`Stopping WAPP hydraters`)
        clearInterval(this.state.hydraterFastId)
        clearInterval(this.state.hydraterSlowId)
    }

    subscribeToPresence() {
        L(`Subscribing to WAPP presence`)
        this.state.accounts.forEach((account) => {
            getApi().WLAPWAPStore.subscribePresence( account.phoneNr + '@c.us')
        })
    }

    setupPhoneNumbers(arrNumbers) {
        this.stopWappHydrater()
        L(`Searching for ${arrNumbers.length} numbers`)
        this.setState({accounts: arrNumbers.map((nr) => ({
                phoneNr: nr,
                lastSeen: new Date(1970)
            }))}, () => {
                this.subscribeToPresence()
                this.startWappHydrater()
        }

        )

    }

    render() {

        return(
            <StyledContainer className={this.props.isOpen ? 'open' : ''}>
                <Content>
                    <NavBar/>
                    <div className="mb-3"/>
                    <Container>
                        <InputPanel demoMode={this.props.demoMode} onSearch={this.setupPhoneNumbers}/>
                        <div className="mb-3"/>
                        {this.state.accounts.length > 0 ? <ResultsPanel accounts={this.state.accounts}/> : <span/> }
                    </Container>
                </Content>
            </StyledContainer>

        )
    }
}

export default MainContent