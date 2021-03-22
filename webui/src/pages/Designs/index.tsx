import { Show } from "solid-js"
import { Flex, FlexColumn } from "~/components/layout"
import { requireLogin } from "~/session"
import { Designs2Provider } from './context'
import { DesignDetail } from "./DesignDetail"
import { DesignList } from "./DesignList"
import { SkyViewer } from "./SkyViewer"



export const Designs = requireLogin(() => {
  return (
    <Designs2Provider>{
      context => (
        <Flex style={{ "flex-grow": 1 }}>
          <DesignList />
          <FlexColumn style={{ "flex-grow": 1 }}>
            <SkyViewer />
            <DesignDetail />
          </FlexColumn>
        </Flex>
      )
    }
    </Designs2Provider>
  )
})
