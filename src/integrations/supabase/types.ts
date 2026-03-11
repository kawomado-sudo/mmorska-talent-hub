export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_user_profiles: {
        Row: {
          agent_email: string
          agent_id: number
          created_at: string
          first_name: string
          last_name: string
          last_synced_at: string
          password_set_at: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_email: string
          agent_id: number
          created_at?: string
          first_name?: string
          last_name?: string
          last_synced_at?: string
          password_set_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_email?: string
          agent_id?: number
          created_at?: string
          first_name?: string
          last_name?: string
          last_synced_at?: string
          password_set_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agents_orders_direct_queue: {
        Row: {
          added_time: string | null
          address_city: string | null
          address_street: string | null
          address_zip: string | null
          agent_email: string
          assigned_to: string | null
          attachments_files: Json | null
          attachments_folder_path: string | null
          bandera: string | null
          boat_hin: string | null
          boat_homeport: string | null
          boat_name: string | null
          boat_reg_number: string | null
          boatname: string | null
          category: string | null
          city: string | null
          created_at: string
          currency: string | null
          customer_company: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          date_reg: string | null
          draft: string | null
          drive: string[] | null
          firma: string | null
          fuel: string[] | null
          hin_ini: string | null
          homeport: string | null
          hull_1: string | null
          id: number
          imie: string | null
          infinity_item_id: string | null
          kw_engine: string | null
          length: string | null
          make_model: string | null
          material: string | null
          nazwisko: string | null
          new_registration_number: string | null
          notes: string | null
          operator: string | null
          order_date: string | null
          order_status:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          payment_method: string | null
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          random_id: string | null
          reg_nr: string | null
          registration_date: string | null
          reja_id: string | null
          serial_engine: string | null
          service_group: string | null
          service_type: string | null
          shipper: string | null
          shipping_status: string | null
          shipyard: string | null
          street: string | null
          submission_id: string
          telefon: string | null
          total_amount: number | null
          updated_at: string | null
          usage: string[] | null
          usage_type: string[] | null
          usluga: string | null
          width: string | null
          year: string | null
          zip: string | null
          zoho_added_time: string | null
          zoho_submission_id: string | null
        }
        Insert: {
          added_time?: string | null
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          agent_email: string
          assigned_to?: string | null
          attachments_files?: Json | null
          attachments_folder_path?: string | null
          bandera?: string | null
          boat_hin?: string | null
          boat_homeport?: string | null
          boat_name?: string | null
          boat_reg_number?: string | null
          boatname?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          currency?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date_reg?: string | null
          draft?: string | null
          drive?: string[] | null
          firma?: string | null
          fuel?: string[] | null
          hin_ini?: string | null
          homeport?: string | null
          hull_1?: string | null
          id?: number
          imie?: string | null
          infinity_item_id?: string | null
          kw_engine?: string | null
          length?: string | null
          make_model?: string | null
          material?: string | null
          nazwisko?: string | null
          new_registration_number?: string | null
          notes?: string | null
          operator?: string | null
          order_date?: string | null
          order_status?:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          payment_method?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          random_id?: string | null
          reg_nr?: string | null
          registration_date?: string | null
          reja_id?: string | null
          serial_engine?: string | null
          service_group?: string | null
          service_type?: string | null
          shipper?: string | null
          shipping_status?: string | null
          shipyard?: string | null
          street?: string | null
          submission_id: string
          telefon?: string | null
          total_amount?: number | null
          updated_at?: string | null
          usage?: string[] | null
          usage_type?: string[] | null
          usluga?: string | null
          width?: string | null
          year?: string | null
          zip?: string | null
          zoho_added_time?: string | null
          zoho_submission_id?: string | null
        }
        Update: {
          added_time?: string | null
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          agent_email?: string
          assigned_to?: string | null
          attachments_files?: Json | null
          attachments_folder_path?: string | null
          bandera?: string | null
          boat_hin?: string | null
          boat_homeport?: string | null
          boat_name?: string | null
          boat_reg_number?: string | null
          boatname?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          currency?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date_reg?: string | null
          draft?: string | null
          drive?: string[] | null
          firma?: string | null
          fuel?: string[] | null
          hin_ini?: string | null
          homeport?: string | null
          hull_1?: string | null
          id?: number
          imie?: string | null
          infinity_item_id?: string | null
          kw_engine?: string | null
          length?: string | null
          make_model?: string | null
          material?: string | null
          nazwisko?: string | null
          new_registration_number?: string | null
          notes?: string | null
          operator?: string | null
          order_date?: string | null
          order_status?:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          payment_method?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          random_id?: string | null
          reg_nr?: string | null
          registration_date?: string | null
          reja_id?: string | null
          serial_engine?: string | null
          service_group?: string | null
          service_type?: string | null
          shipper?: string | null
          shipping_status?: string | null
          shipyard?: string | null
          street?: string | null
          submission_id?: string
          telefon?: string | null
          total_amount?: number | null
          updated_at?: string | null
          usage?: string[] | null
          usage_type?: string[] | null
          usluga?: string | null
          width?: string | null
          year?: string | null
          zip?: string | null
          zoho_added_time?: string | null
          zoho_submission_id?: string | null
        }
        Relationships: []
      }
      agents_orders_raw_queue: {
        Row: {
          created_at: string
          error_message: string | null
          form_id: string
          id: number
          processed_at: string | null
          processing_status: string
          raw_data: Json
          submission_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          form_id: string
          id?: number
          processed_at?: string | null
          processing_status?: string
          raw_data: Json
          submission_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          form_id?: string
          id?: number
          processed_at?: string | null
          processing_status?: string
          raw_data?: Json
          submission_id?: string
        }
        Relationships: []
      }
      archiwum_infinity_stare: {
        Row: {
          "📦 Shipper": string | null
          "📬 Numer Przesyłki": string | null
          "🚤 Boat name": string | null
          "🛸URZĄD": string | null
          "Assigned to": string | null
          BANDERA: string | null
          Category: string | null
          "Commission Based": boolean | null
          "Created At": string | null
          "Created By": string | null
          "Dane Zamówienia": string | null
          "Data UPP": string | null
          Description: string | null
          "Dni do dzis": number | null
          "Dni od UPP": string | null
          email: string | null
          "FAKTURA/PARAGON": string | null
          "ID KARTY DO ZWROTU": string | null
          "Koszt Tlumaczenia": string | null
          "kwota EUR": string | null
          "kwota PLN": string | null
          MMSI: string | null
          "Name and Surname": string | null
          "Nr Rejestracyjny": string | null
          "Payment Status": string | null
          Phone: string | null
          REJAiD: string | null
          "Rezerwacja Numeru": string | null
          ServiceGroup: string | null
          SmS: boolean | null
          "Source Folder": string | null
          "Starzenie się wniosku": string | null
          Status: string | null
          "Status tłumaczenia": string | null
          "Status Zwrotu": string | null
          "USŁUGI DODATKOWE": string | null
          "Utworzono dnia": string | null
          Wykorzystany: string | null
          "Zdjęcie Karty do Zwrotu": string | null
        }
        Insert: {
          "📦 Shipper"?: string | null
          "📬 Numer Przesyłki"?: string | null
          "🚤 Boat name"?: string | null
          "🛸URZĄD"?: string | null
          "Assigned to"?: string | null
          BANDERA?: string | null
          Category?: string | null
          "Commission Based"?: boolean | null
          "Created At"?: string | null
          "Created By"?: string | null
          "Dane Zamówienia"?: string | null
          "Data UPP"?: string | null
          Description?: string | null
          "Dni do dzis"?: number | null
          "Dni od UPP"?: string | null
          email?: string | null
          "FAKTURA/PARAGON"?: string | null
          "ID KARTY DO ZWROTU"?: string | null
          "Koszt Tlumaczenia"?: string | null
          "kwota EUR"?: string | null
          "kwota PLN"?: string | null
          MMSI?: string | null
          "Name and Surname"?: string | null
          "Nr Rejestracyjny"?: string | null
          "Payment Status"?: string | null
          Phone?: string | null
          REJAiD?: string | null
          "Rezerwacja Numeru"?: string | null
          ServiceGroup?: string | null
          SmS?: boolean | null
          "Source Folder"?: string | null
          "Starzenie się wniosku"?: string | null
          Status?: string | null
          "Status tłumaczenia"?: string | null
          "Status Zwrotu"?: string | null
          "USŁUGI DODATKOWE"?: string | null
          "Utworzono dnia"?: string | null
          Wykorzystany?: string | null
          "Zdjęcie Karty do Zwrotu"?: string | null
        }
        Update: {
          "📦 Shipper"?: string | null
          "📬 Numer Przesyłki"?: string | null
          "🚤 Boat name"?: string | null
          "🛸URZĄD"?: string | null
          "Assigned to"?: string | null
          BANDERA?: string | null
          Category?: string | null
          "Commission Based"?: boolean | null
          "Created At"?: string | null
          "Created By"?: string | null
          "Dane Zamówienia"?: string | null
          "Data UPP"?: string | null
          Description?: string | null
          "Dni do dzis"?: number | null
          "Dni od UPP"?: string | null
          email?: string | null
          "FAKTURA/PARAGON"?: string | null
          "ID KARTY DO ZWROTU"?: string | null
          "Koszt Tlumaczenia"?: string | null
          "kwota EUR"?: string | null
          "kwota PLN"?: string | null
          MMSI?: string | null
          "Name and Surname"?: string | null
          "Nr Rejestracyjny"?: string | null
          "Payment Status"?: string | null
          Phone?: string | null
          REJAiD?: string | null
          "Rezerwacja Numeru"?: string | null
          ServiceGroup?: string | null
          SmS?: boolean | null
          "Source Folder"?: string | null
          "Starzenie się wniosku"?: string | null
          Status?: string | null
          "Status tłumaczenia"?: string | null
          "Status Zwrotu"?: string | null
          "USŁUGI DODATKOWE"?: string | null
          "Utworzono dnia"?: string | null
          Wykorzystany?: string | null
          "Zdjęcie Karty do Zwrotu"?: string | null
        }
        Relationships: []
      }
      B2Bapp_incoming_orders_queue: {
        Row: {
          added_time: string | null
          additional_services:
            | Database["public"]["Enums"]["additional_service_enum"][]
            | null
          additional_services_total_eur: number | null
          address_city: string | null
          address_street: string | null
          address_zip: string | null
          agent_email: string
          assigned_to: string | null
          bandera: string | null
          boat_hin: string | null
          boat_homeport: string | null
          boat_name: string | null
          boat_reg_number: string | null
          boatname: string | null
          category: string | null
          city: string | null
          created_at: string
          currency: string | null
          customer_company: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          date_reg: string | null
          draft: string | null
          drive: Database["public"]["Enums"]["b2b_main_drive_enum"][] | null
          firma: string | null
          fuel: string[] | null
          hin_ini: string | null
          homeport: Database["public"]["Enums"]["b2b_homeport_enum"] | null
          hull_1: string | null
          id: number
          imie: string | null
          infinity_item_id: string | null
          kw_engine: string | null
          length: string | null
          make_model: string | null
          material: Database["public"]["Enums"]["b2b_hull_material_enum"] | null
          nazwisko: string | null
          new_registration_number: string | null
          notes: string | null
          operator: string | null
          operator_designated: boolean | null
          operator_details: string | null
          order_date: string | null
          order_status:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          owner_country: string | null
          owner_type: Database["public"]["Enums"]["owner_details_enum"] | null
          payment_method: string | null
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          random_id: string | null
          reg_nr: string | null
          registration_date: string | null
          reja_id: string | null
          serial_engine: string | null
          service_group: string | null
          service_type: string | null
          shipper: string | null
          shipping_status: string | null
          shipyard: Database["public"]["Enums"]["b2b_producer_enum"] | null
          street: string | null
          submission_id: string
          telefon: string | null
          total_amount: number | null
          updated_at: string | null
          usage: string[] | null
          usage_type: string[] | null
          usluga: string | null
          width: string | null
          year: string | null
          zip: string | null
          zoho_added_time: string | null
          zoho_submission_id: string | null
        }
        Insert: {
          added_time?: string | null
          additional_services?:
            | Database["public"]["Enums"]["additional_service_enum"][]
            | null
          additional_services_total_eur?: number | null
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          agent_email: string
          assigned_to?: string | null
          bandera?: string | null
          boat_hin?: string | null
          boat_homeport?: string | null
          boat_name?: string | null
          boat_reg_number?: string | null
          boatname?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          currency?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date_reg?: string | null
          draft?: string | null
          drive?: Database["public"]["Enums"]["b2b_main_drive_enum"][] | null
          firma?: string | null
          fuel?: string[] | null
          hin_ini?: string | null
          homeport?: Database["public"]["Enums"]["b2b_homeport_enum"] | null
          hull_1?: string | null
          id: number
          imie?: string | null
          infinity_item_id?: string | null
          kw_engine?: string | null
          length?: string | null
          make_model?: string | null
          material?:
            | Database["public"]["Enums"]["b2b_hull_material_enum"]
            | null
          nazwisko?: string | null
          new_registration_number?: string | null
          notes?: string | null
          operator?: string | null
          operator_designated?: boolean | null
          operator_details?: string | null
          order_date?: string | null
          order_status?:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          owner_country?: string | null
          owner_type?: Database["public"]["Enums"]["owner_details_enum"] | null
          payment_method?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          random_id?: string | null
          reg_nr?: string | null
          registration_date?: string | null
          reja_id?: string | null
          serial_engine?: string | null
          service_group?: string | null
          service_type?: string | null
          shipper?: string | null
          shipping_status?: string | null
          shipyard?: Database["public"]["Enums"]["b2b_producer_enum"] | null
          street?: string | null
          submission_id: string
          telefon?: string | null
          total_amount?: number | null
          updated_at?: string | null
          usage?: string[] | null
          usage_type?: string[] | null
          usluga?: string | null
          width?: string | null
          year?: string | null
          zip?: string | null
          zoho_added_time?: string | null
          zoho_submission_id?: string | null
        }
        Update: {
          added_time?: string | null
          additional_services?:
            | Database["public"]["Enums"]["additional_service_enum"][]
            | null
          additional_services_total_eur?: number | null
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          agent_email?: string
          assigned_to?: string | null
          bandera?: string | null
          boat_hin?: string | null
          boat_homeport?: string | null
          boat_name?: string | null
          boat_reg_number?: string | null
          boatname?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          currency?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date_reg?: string | null
          draft?: string | null
          drive?: Database["public"]["Enums"]["b2b_main_drive_enum"][] | null
          firma?: string | null
          fuel?: string[] | null
          hin_ini?: string | null
          homeport?: Database["public"]["Enums"]["b2b_homeport_enum"] | null
          hull_1?: string | null
          id?: number
          imie?: string | null
          infinity_item_id?: string | null
          kw_engine?: string | null
          length?: string | null
          make_model?: string | null
          material?:
            | Database["public"]["Enums"]["b2b_hull_material_enum"]
            | null
          nazwisko?: string | null
          new_registration_number?: string | null
          notes?: string | null
          operator?: string | null
          operator_designated?: boolean | null
          operator_details?: string | null
          order_date?: string | null
          order_status?:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          owner_country?: string | null
          owner_type?: Database["public"]["Enums"]["owner_details_enum"] | null
          payment_method?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          random_id?: string | null
          reg_nr?: string | null
          registration_date?: string | null
          reja_id?: string | null
          serial_engine?: string | null
          service_group?: string | null
          service_type?: string | null
          shipper?: string | null
          shipping_status?: string | null
          shipyard?: Database["public"]["Enums"]["b2b_producer_enum"] | null
          street?: string | null
          submission_id?: string
          telefon?: string | null
          total_amount?: number | null
          updated_at?: string | null
          usage?: string[] | null
          usage_type?: string[] | null
          usluga?: string | null
          width?: string | null
          year?: string | null
          zip?: string | null
          zoho_added_time?: string | null
          zoho_submission_id?: string | null
        }
        Relationships: []
      }
      boats_data: {
        Row: {
          admin_status:
            | Database["public"]["Enums"]["boat_admin_status_enum"]
            | null
          bandera: string | null
          boat_hin: string | null
          boat_homeport: string | null
          boat_name: string
          boat_reg_number: string | null
          boat_type: string | null
          created_at: string | null
          flag_expiry_date: string | null
          id: string
          last_service_date: string | null
          next_service_due: string | null
          registration_date: string | null
          updated_at: string | null
          usage_type: string[] | null
        }
        Insert: {
          admin_status?:
            | Database["public"]["Enums"]["boat_admin_status_enum"]
            | null
          bandera?: string | null
          boat_hin?: string | null
          boat_homeport?: string | null
          boat_name: string
          boat_reg_number?: string | null
          boat_type?: string | null
          created_at?: string | null
          flag_expiry_date?: string | null
          id?: string
          last_service_date?: string | null
          next_service_due?: string | null
          registration_date?: string | null
          updated_at?: string | null
          usage_type?: string[] | null
        }
        Update: {
          admin_status?:
            | Database["public"]["Enums"]["boat_admin_status_enum"]
            | null
          bandera?: string | null
          boat_hin?: string | null
          boat_homeport?: string | null
          boat_name?: string
          boat_reg_number?: string | null
          boat_type?: string | null
          created_at?: string | null
          flag_expiry_date?: string | null
          id?: string
          last_service_date?: string | null
          next_service_due?: string | null
          registration_date?: string | null
          updated_at?: string | null
          usage_type?: string[] | null
        }
        Relationships: []
      }
      call_events: {
        Row: {
          "ai voice agent": string | null
          "ai voice agent transfer branch": string | null
          "aircall number": string | null
          answered: string | null
          "automatic callback pending time": string | null
          "call direction - type": string | null
          "call id": string | null
          "call id (internal)": number | null
          "call start time": string | null
          "call timeline": string | null
          "call type": string | null
          "callback details": string | null
          "callback failure": string | null
          country_code: string | null
          "customer number": string | null
          "datetime (utc)": string | null
          direction: string | null
          "disconnected by": string | null
          "duration (in call)": number | null
          "entry number": string | null
          from: number | null
          "in-call duration": string | null
          "ivr branch": string | null
          "ivr widget": string | null
          missed_call_reason: string | null
          recording: string | null
          team: string | null
          "time in ivr": string | null
          "time to answer": string | null
          "time with ai voice agent": string | null
          to: number | null
          user: string | null
          voicemail: string | null
          "waiting time": string | null
        }
        Insert: {
          "ai voice agent"?: string | null
          "ai voice agent transfer branch"?: string | null
          "aircall number"?: string | null
          answered?: string | null
          "automatic callback pending time"?: string | null
          "call direction - type"?: string | null
          "call id"?: string | null
          "call id (internal)"?: number | null
          "call start time"?: string | null
          "call timeline"?: string | null
          "call type"?: string | null
          "callback details"?: string | null
          "callback failure"?: string | null
          country_code?: string | null
          "customer number"?: string | null
          "datetime (utc)"?: string | null
          direction?: string | null
          "disconnected by"?: string | null
          "duration (in call)"?: number | null
          "entry number"?: string | null
          from?: number | null
          "in-call duration"?: string | null
          "ivr branch"?: string | null
          "ivr widget"?: string | null
          missed_call_reason?: string | null
          recording?: string | null
          team?: string | null
          "time in ivr"?: string | null
          "time to answer"?: string | null
          "time with ai voice agent"?: string | null
          to?: number | null
          user?: string | null
          voicemail?: string | null
          "waiting time"?: string | null
        }
        Update: {
          "ai voice agent"?: string | null
          "ai voice agent transfer branch"?: string | null
          "aircall number"?: string | null
          answered?: string | null
          "automatic callback pending time"?: string | null
          "call direction - type"?: string | null
          "call id"?: string | null
          "call id (internal)"?: number | null
          "call start time"?: string | null
          "call timeline"?: string | null
          "call type"?: string | null
          "callback details"?: string | null
          "callback failure"?: string | null
          country_code?: string | null
          "customer number"?: string | null
          "datetime (utc)"?: string | null
          direction?: string | null
          "disconnected by"?: string | null
          "duration (in call)"?: number | null
          "entry number"?: string | null
          from?: number | null
          "in-call duration"?: string | null
          "ivr branch"?: string | null
          "ivr widget"?: string | null
          missed_call_reason?: string | null
          recording?: string | null
          team?: string | null
          "time in ivr"?: string | null
          "time to answer"?: string | null
          "time with ai voice agent"?: string | null
          to?: number | null
          user?: string | null
          voicemail?: string | null
          "waiting time"?: string | null
        }
        Relationships: []
      }
      infinity_asis_closed_10112025_legacy: {
        Row: {
          "📦 Shipper": string | null
          "📬 Numer Przesyłki": string | null
          "🚤 Boat name": string | null
          "🛸URZĄD": string | null
          "Assigned to": string | null
          BANDERA: string | null
          Category: string | null
          "Checklista do REJA24": string | null
          "Created At": string | null
          "Created By": string | null
          "Dane Zamówienia": string | null
          "Data UPP": string | null
          "DATA ZWROTU DO URZĘDU": string | null
          Decyzje: string | null
          Description: string | null
          "Dni do dzis": number | null
          "Dni od UPP": string | null
          "DO TŁUMACZENIA": string | null
          "DOKUMENT DO ZWROTU": string | null
          Email: string | null
          "FAKTURA/PARAGON": string | null
          "ID KARTY DO ZWROTU": string | null
          "Koszt Tlumaczenia": string | null
          "kwota EUR": string | null
          "kwota PLN": string | null
          MMSI: string | null
          "Name and Surname": string | null
          "Nr Rejestracyjny": string | null
          "Payment Status": string | null
          Phone: string | null
          Priorytet: number | null
          REJAiD: string | null
          "Rezerwacja Numeru": string | null
          ServiceGroup: string | null
          SmS: boolean | null
          "Source Folder": string | null
          "Starzenie się wniosku": string | null
          Status: string | null
          "Status tłumaczenia": string | null
          "Status Zwrotu": string | null
          "Szacowane Data Wydania UKE": string | null
          TODAY: string | null
          "Updated At": string
          Usługi: string | null
          "USŁUGI DODATKOWE": string | null
          "Utworzono dnia": string | null
          "Wybrane Usługi": string | null
          Wykorzystany: string | null
          "Zdjęcie Karty do Zwrotu": string | null
          "Złożono dnia": string | null
        }
        Insert: {
          "📦 Shipper"?: string | null
          "📬 Numer Przesyłki"?: string | null
          "🚤 Boat name"?: string | null
          "🛸URZĄD"?: string | null
          "Assigned to"?: string | null
          BANDERA?: string | null
          Category?: string | null
          "Checklista do REJA24"?: string | null
          "Created At"?: string | null
          "Created By"?: string | null
          "Dane Zamówienia"?: string | null
          "Data UPP"?: string | null
          "DATA ZWROTU DO URZĘDU"?: string | null
          Decyzje?: string | null
          Description?: string | null
          "Dni do dzis"?: number | null
          "Dni od UPP"?: string | null
          "DO TŁUMACZENIA"?: string | null
          "DOKUMENT DO ZWROTU"?: string | null
          Email?: string | null
          "FAKTURA/PARAGON"?: string | null
          "ID KARTY DO ZWROTU"?: string | null
          "Koszt Tlumaczenia"?: string | null
          "kwota EUR"?: string | null
          "kwota PLN"?: string | null
          MMSI?: string | null
          "Name and Surname"?: string | null
          "Nr Rejestracyjny"?: string | null
          "Payment Status"?: string | null
          Phone?: string | null
          Priorytet?: number | null
          REJAiD?: string | null
          "Rezerwacja Numeru"?: string | null
          ServiceGroup?: string | null
          SmS?: boolean | null
          "Source Folder"?: string | null
          "Starzenie się wniosku"?: string | null
          Status?: string | null
          "Status tłumaczenia"?: string | null
          "Status Zwrotu"?: string | null
          "Szacowane Data Wydania UKE"?: string | null
          TODAY?: string | null
          "Updated At": string
          Usługi?: string | null
          "USŁUGI DODATKOWE"?: string | null
          "Utworzono dnia"?: string | null
          "Wybrane Usługi"?: string | null
          Wykorzystany?: string | null
          "Zdjęcie Karty do Zwrotu"?: string | null
          "Złożono dnia"?: string | null
        }
        Update: {
          "📦 Shipper"?: string | null
          "📬 Numer Przesyłki"?: string | null
          "🚤 Boat name"?: string | null
          "🛸URZĄD"?: string | null
          "Assigned to"?: string | null
          BANDERA?: string | null
          Category?: string | null
          "Checklista do REJA24"?: string | null
          "Created At"?: string | null
          "Created By"?: string | null
          "Dane Zamówienia"?: string | null
          "Data UPP"?: string | null
          "DATA ZWROTU DO URZĘDU"?: string | null
          Decyzje?: string | null
          Description?: string | null
          "Dni do dzis"?: number | null
          "Dni od UPP"?: string | null
          "DO TŁUMACZENIA"?: string | null
          "DOKUMENT DO ZWROTU"?: string | null
          Email?: string | null
          "FAKTURA/PARAGON"?: string | null
          "ID KARTY DO ZWROTU"?: string | null
          "Koszt Tlumaczenia"?: string | null
          "kwota EUR"?: string | null
          "kwota PLN"?: string | null
          MMSI?: string | null
          "Name and Surname"?: string | null
          "Nr Rejestracyjny"?: string | null
          "Payment Status"?: string | null
          Phone?: string | null
          Priorytet?: number | null
          REJAiD?: string | null
          "Rezerwacja Numeru"?: string | null
          ServiceGroup?: string | null
          SmS?: boolean | null
          "Source Folder"?: string | null
          "Starzenie się wniosku"?: string | null
          Status?: string | null
          "Status tłumaczenia"?: string | null
          "Status Zwrotu"?: string | null
          "Szacowane Data Wydania UKE"?: string | null
          TODAY?: string | null
          "Updated At"?: string
          Usługi?: string | null
          "USŁUGI DODATKOWE"?: string | null
          "Utworzono dnia"?: string | null
          "Wybrane Usługi"?: string | null
          Wykorzystany?: string | null
          "Zdjęcie Karty do Zwrotu"?: string | null
          "Złożono dnia"?: string | null
        }
        Relationships: []
      }
      OH_orders_working_table: {
        Row: {
          added_time: string | null
          address_city: string | null
          address_street: string | null
          address_zip: string | null
          agent_email: string
          assigned_to: string | null
          bandera: string | null
          boat_hin: string | null
          boat_homeport: string | null
          boat_name: string | null
          boat_reg_number: string | null
          boatname: string | null
          category: string | null
          city: string | null
          created_at: string
          currency: string | null
          customer_company: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          date_reg: string | null
          draft: string | null
          drive: string[] | null
          firma: string | null
          fuel: string[] | null
          hin_ini: string | null
          homeport: string | null
          hull_1: string | null
          id: number
          imie: string | null
          infinity_item_id: string | null
          kw_engine: string | null
          length: string | null
          make_model: string | null
          material: string | null
          nazwisko: string | null
          new_registration_number: string | null
          notes: string | null
          operator: string | null
          order_date: string | null
          order_status:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          payment_method: string | null
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          random_id: string | null
          reg_nr: string | null
          registration_date: string | null
          reja_id: string | null
          serial_engine: string | null
          service_group: string | null
          service_type: string | null
          shipper: string | null
          shipping_status: string | null
          shipyard: string | null
          street: string | null
          submission_id: string
          telefon: string | null
          total_amount: number | null
          updated_at: string | null
          usage: string[] | null
          usage_type: string[] | null
          usluga: string | null
          width: string | null
          year: string | null
          zip: string | null
          zoho_added_time: string | null
          zoho_submission_id: string | null
        }
        Insert: {
          added_time?: string | null
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          agent_email: string
          assigned_to?: string | null
          bandera?: string | null
          boat_hin?: string | null
          boat_homeport?: string | null
          boat_name?: string | null
          boat_reg_number?: string | null
          boatname?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          currency?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date_reg?: string | null
          draft?: string | null
          drive?: string[] | null
          firma?: string | null
          fuel?: string[] | null
          hin_ini?: string | null
          homeport?: string | null
          hull_1?: string | null
          id: number
          imie?: string | null
          infinity_item_id?: string | null
          kw_engine?: string | null
          length?: string | null
          make_model?: string | null
          material?: string | null
          nazwisko?: string | null
          new_registration_number?: string | null
          notes?: string | null
          operator?: string | null
          order_date?: string | null
          order_status?:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          payment_method?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          random_id?: string | null
          reg_nr?: string | null
          registration_date?: string | null
          reja_id?: string | null
          serial_engine?: string | null
          service_group?: string | null
          service_type?: string | null
          shipper?: string | null
          shipping_status?: string | null
          shipyard?: string | null
          street?: string | null
          submission_id: string
          telefon?: string | null
          total_amount?: number | null
          updated_at?: string | null
          usage?: string[] | null
          usage_type?: string[] | null
          usluga?: string | null
          width?: string | null
          year?: string | null
          zip?: string | null
          zoho_added_time?: string | null
          zoho_submission_id?: string | null
        }
        Update: {
          added_time?: string | null
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          agent_email?: string
          assigned_to?: string | null
          bandera?: string | null
          boat_hin?: string | null
          boat_homeport?: string | null
          boat_name?: string | null
          boat_reg_number?: string | null
          boatname?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          currency?: string | null
          customer_company?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date_reg?: string | null
          draft?: string | null
          drive?: string[] | null
          firma?: string | null
          fuel?: string[] | null
          hin_ini?: string | null
          homeport?: string | null
          hull_1?: string | null
          id?: number
          imie?: string | null
          infinity_item_id?: string | null
          kw_engine?: string | null
          length?: string | null
          make_model?: string | null
          material?: string | null
          nazwisko?: string | null
          new_registration_number?: string | null
          notes?: string | null
          operator?: string | null
          order_date?: string | null
          order_status?:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          payment_method?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          random_id?: string | null
          reg_nr?: string | null
          registration_date?: string | null
          reja_id?: string | null
          serial_engine?: string | null
          service_group?: string | null
          service_type?: string | null
          shipper?: string | null
          shipping_status?: string | null
          shipyard?: string | null
          street?: string | null
          submission_id?: string
          telefon?: string | null
          total_amount?: number | null
          updated_at?: string | null
          usage?: string[] | null
          usage_type?: string[] | null
          usluga?: string | null
          width?: string | null
          year?: string | null
          zip?: string | null
          zoho_added_time?: string | null
          zoho_submission_id?: string | null
        }
        Relationships: []
      }
      orders_status_history: {
        Row: {
          change_source: string | null
          changed_at: string | null
          changed_by: string | null
          id: number
          new_order_status: string | null
          new_payment_status: string | null
          new_shipping_status: string | null
          notes: string | null
          old_order_status: string | null
          old_payment_status: string | null
          old_shipping_status: string | null
          order_id: string
        }
        Insert: {
          change_source?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: number
          new_order_status?: string | null
          new_payment_status?: string | null
          new_shipping_status?: string | null
          notes?: string | null
          old_order_status?: string | null
          old_payment_status?: string | null
          old_shipping_status?: string | null
          order_id: string
        }
        Update: {
          change_source?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: number
          new_order_status?: string | null
          new_payment_status?: string | null
          new_shipping_status?: string | null
          notes?: string | null
          old_order_status?: string | null
          old_payment_status?: string | null
          old_shipping_status?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoho_orders_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "team_members_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoho_orders_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "zoho_orders_direct"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intends_stripe: {
        Row: {
          amount: number
          boatname: string | null
          city: string | null
          country: string | null
          created_at: string
          currency: string
          line1: string | null
          line2: string | null
          name: string | null
          object: string
          object_id: string | null
          payment_id: string
          postal_code: string | null
          receipt_email: string | null
          status: string
          type: string
          webhookurl: string | null
        }
        Insert: {
          amount: number
          boatname?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency: string
          line1?: string | null
          line2?: string | null
          name?: string | null
          object: string
          object_id?: string | null
          payment_id: string
          postal_code?: string | null
          receipt_email?: string | null
          status: string
          type: string
          webhookurl?: string | null
        }
        Update: {
          amount?: number
          boatname?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          line1?: string | null
          line2?: string | null
          name?: string | null
          object?: string
          object_id?: string | null
          payment_id?: string
          postal_code?: string | null
          receipt_email?: string | null
          status?: string
          type?: string
          webhookurl?: string | null
        }
        Relationships: []
      }
      queue_conflicts_log: {
        Row: {
          conflict_reason: string
          detected_at: string
          id: number
          notes: string | null
          queue_table: string
          raw_data: Json | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          submission_id: string
        }
        Insert: {
          conflict_reason: string
          detected_at?: string
          id?: number
          notes?: string | null
          queue_table: string
          raw_data?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          submission_id: string
        }
        Update: {
          conflict_reason?: string
          detected_at?: string
          id?: number
          notes?: string | null
          queue_table?: string
          raw_data?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          submission_id?: string
        }
        Relationships: []
      }
      zoho_orders_asis_241025: {
        Row: {
          Added_Time: string
          adress: string | null
          armator: string | null
          armator_details: string | null
          "Attachment Service Status": string | null
          BOA: number | null
          boatname: string | null
          boatname2: string | null
          brand_model: string | null
          comments: string | null
          company_name: string | null
          customer_source:
            | Database["public"]["Enums"]["customer_source_enum"]
            | null
          DRAFT: number | null
          email: string
          engine_1: string | null
          engine_mounting: string | null
          engine1_brand: string | null
          engine2: string | null
          engine2_brand: string | null
          engine3: string | null
          engine3_brand: string | null
          express: string | null
          fuel: string | null
          HIn: string | null
          homeport_inland: string | null
          homeport_seagoing: string | null
          hull_number: string | null
          id_supabase: number
          import_source: string | null
          invoice_needed: string | null
          legacy_order_id: string | null
          LOA: number | null
          LOA_gropu: string | null
          "Mail Merge Status": string | null
          main_material: string | null
          main_populsion: string | null
          no_of_hulls: string | null
          oswiadczenie_prawda: string | null
          overall_price: string | null
          owner_details: string | null
          owner_type: string | null
          payment_form: string | null
          "PDF Status": string | null
          phone: string | null
          power_engine1: string | null
          power_engine2: string | null
          power_engine3: string | null
          producer: string | null
          production_year: number | null
          random_id: string
          "Referrer Name": string | null
          reg_number: string | null
          registration_date: string | null
          regulamin_zgoda: string | null
          residency: Database["public"]["Enums"]["residency_enum"] | null
          RODO: string | null
          serial_engine1: string | null
          serial_engine2: string | null
          serial_engine3: string | null
          service_type: string | null
          shipment: string | null
          shipping_address: string | null
          signing_form: string | null
          "Task Owner": string | null
          usage: string | null
          waters: string | null
          "Zoho Sign Status": string | null
        }
        Insert: {
          Added_Time: string
          adress?: string | null
          armator?: string | null
          armator_details?: string | null
          "Attachment Service Status"?: string | null
          BOA?: number | null
          boatname?: string | null
          boatname2?: string | null
          brand_model?: string | null
          comments?: string | null
          company_name?: string | null
          customer_source?:
            | Database["public"]["Enums"]["customer_source_enum"]
            | null
          DRAFT?: number | null
          email: string
          engine_1?: string | null
          engine_mounting?: string | null
          engine1_brand?: string | null
          engine2?: string | null
          engine2_brand?: string | null
          engine3?: string | null
          engine3_brand?: string | null
          express?: string | null
          fuel?: string | null
          HIn?: string | null
          homeport_inland?: string | null
          homeport_seagoing?: string | null
          hull_number?: string | null
          id_supabase?: number
          import_source?: string | null
          invoice_needed?: string | null
          legacy_order_id?: string | null
          LOA?: number | null
          LOA_gropu?: string | null
          "Mail Merge Status"?: string | null
          main_material?: string | null
          main_populsion?: string | null
          no_of_hulls?: string | null
          oswiadczenie_prawda?: string | null
          overall_price?: string | null
          owner_details?: string | null
          owner_type?: string | null
          payment_form?: string | null
          "PDF Status"?: string | null
          phone?: string | null
          power_engine1?: string | null
          power_engine2?: string | null
          power_engine3?: string | null
          producer?: string | null
          production_year?: number | null
          random_id: string
          "Referrer Name"?: string | null
          reg_number?: string | null
          registration_date?: string | null
          regulamin_zgoda?: string | null
          residency?: Database["public"]["Enums"]["residency_enum"] | null
          RODO?: string | null
          serial_engine1?: string | null
          serial_engine2?: string | null
          serial_engine3?: string | null
          service_type?: string | null
          shipment?: string | null
          shipping_address?: string | null
          signing_form?: string | null
          "Task Owner"?: string | null
          usage?: string | null
          waters?: string | null
          "Zoho Sign Status"?: string | null
        }
        Update: {
          Added_Time?: string
          adress?: string | null
          armator?: string | null
          armator_details?: string | null
          "Attachment Service Status"?: string | null
          BOA?: number | null
          boatname?: string | null
          boatname2?: string | null
          brand_model?: string | null
          comments?: string | null
          company_name?: string | null
          customer_source?:
            | Database["public"]["Enums"]["customer_source_enum"]
            | null
          DRAFT?: number | null
          email?: string
          engine_1?: string | null
          engine_mounting?: string | null
          engine1_brand?: string | null
          engine2?: string | null
          engine2_brand?: string | null
          engine3?: string | null
          engine3_brand?: string | null
          express?: string | null
          fuel?: string | null
          HIn?: string | null
          homeport_inland?: string | null
          homeport_seagoing?: string | null
          hull_number?: string | null
          id_supabase?: number
          import_source?: string | null
          invoice_needed?: string | null
          legacy_order_id?: string | null
          LOA?: number | null
          LOA_gropu?: string | null
          "Mail Merge Status"?: string | null
          main_material?: string | null
          main_populsion?: string | null
          no_of_hulls?: string | null
          oswiadczenie_prawda?: string | null
          overall_price?: string | null
          owner_details?: string | null
          owner_type?: string | null
          payment_form?: string | null
          "PDF Status"?: string | null
          phone?: string | null
          power_engine1?: string | null
          power_engine2?: string | null
          power_engine3?: string | null
          producer?: string | null
          production_year?: number | null
          random_id?: string
          "Referrer Name"?: string | null
          reg_number?: string | null
          registration_date?: string | null
          regulamin_zgoda?: string | null
          residency?: Database["public"]["Enums"]["residency_enum"] | null
          RODO?: string | null
          serial_engine1?: string | null
          serial_engine2?: string | null
          serial_engine3?: string | null
          service_type?: string | null
          shipment?: string | null
          shipping_address?: string | null
          signing_form?: string | null
          "Task Owner"?: string | null
          usage?: string | null
          waters?: string | null
          "Zoho Sign Status"?: string | null
        }
        Relationships: []
      }
      zoho_orders_direct: {
        Row: {
          assigned_to: string | null
          billing_address: Json | null
          boat_name: string | null
          boat_type: string | null
          carrier: string | null
          created_at: string | null
          currency: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          customer_type: string | null
          delivered_date: string | null
          id: string
          infinity_item_id: string | null
          infinity_raw_id: number | null
          order_date: string
          order_status:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          payment_date: string | null
          payment_status: string | null
          reja_id: string | null
          service_name: string | null
          service_type: string
          shipped_date: string | null
          shipping_address: Json | null
          shipping_status: string | null
          softr_id: string | null
          total_amount: number | null
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string | null
          zoho_order_id: string
          zoho_raw_id: number | null
        }
        Insert: {
          assigned_to?: string | null
          billing_address?: Json | null
          boat_name?: string | null
          boat_type?: string | null
          carrier?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          customer_type?: string | null
          delivered_date?: string | null
          id?: string
          infinity_item_id?: string | null
          infinity_raw_id?: number | null
          order_date?: string
          order_status?:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          payment_date?: string | null
          payment_status?: string | null
          reja_id?: string | null
          service_name?: string | null
          service_type: string
          shipped_date?: string | null
          shipping_address?: Json | null
          shipping_status?: string | null
          softr_id?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          zoho_order_id: string
          zoho_raw_id?: number | null
        }
        Update: {
          assigned_to?: string | null
          billing_address?: Json | null
          boat_name?: string | null
          boat_type?: string | null
          carrier?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          customer_type?: string | null
          delivered_date?: string | null
          id?: string
          infinity_item_id?: string | null
          infinity_raw_id?: number | null
          order_date?: string
          order_status?:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          payment_date?: string | null
          payment_status?: string | null
          reja_id?: string | null
          service_name?: string | null
          service_type?: string
          shipped_date?: string | null
          shipping_address?: Json | null
          shipping_status?: string | null
          softr_id?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          zoho_order_id?: string
          zoho_raw_id?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      cost_dashboard_summary: {
        Row: {
          count_overdue: number | null
          invoices_approved: number | null
          invoices_describing: number | null
          invoices_in_workflow: number | null
          invoices_new: number | null
          invoices_paid: number | null
          invoices_rejected: number | null
          total_overdue_pln: number | null
          total_pending_pln: number | null
          total_to_pay_pln: number | null
        }
        Relationships: []
      }
      cost_invoices_full: {
        Row: {
          ai_confidence: number | null
          approved_by: string | null
          bank_account_id: string | null
          contractor_country: string | null
          contractor_id: string | null
          contractor_name: string | null
          contractor_nip: string | null
          contractor_vies: boolean | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          doc_filename: string | null
          doc_mime_type: string | null
          doc_ocr_status: string | null
          doc_size_bytes: number | null
          doc_type_code: string | null
          doc_type_name: string | null
          doc_url: string | null
          document_id: string | null
          document_type_id: string | null
          due_date: string | null
          exchange_rate: number | null
          exchange_rate_date: string | null
          gross_amount: number | null
          gross_amount_pln: number | null
          id: string | null
          invoice_number: string | null
          invoice_type: string | null
          issue_date: string | null
          ksef_id: string | null
          ksef_number: string | null
          net_amount: number | null
          net_amount_pln: number | null
          notes: string | null
          ocr_raw_data: Json | null
          payment_date: string | null
          payment_method: string | null
          pdf_url: string | null
          project_code: string | null
          project_id: string | null
          project_name: string | null
          source: Database["public"]["Enums"]["invoice_source"] | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          tags: string[] | null
          updated_at: string | null
          vat_amount: number | null
          vat_amount_pln: number | null
        }
        Relationships: []
      }
      cost_invoices_with_docs: {
        Row: {
          approved_by: string | null
          contractor_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          doc_mime_type: string | null
          doc_name: string | null
          doc_ocr_status: string | null
          doc_size_bytes: number | null
          doc_url: string | null
          document_id: string | null
          due_date: string | null
          exchange_rate: number | null
          exchange_rate_date: string | null
          gross_amount: number | null
          gross_amount_pln: number | null
          id: string | null
          invoice_number: string | null
          issue_date: string | null
          net_amount: number | null
          net_amount_pln: number | null
          payment_date: string | null
          pdf_url: string | null
          project_id: string | null
          source: Database["public"]["Enums"]["invoice_source"] | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          updated_at: string | null
          vat_amount: number | null
          vat_amount_pln: number | null
        }
        Relationships: []
      }
      cost_payments_pending: {
        Row: {
          amount: number | null
          approved_by: string | null
          bank_account_id: string | null
          bank_iban: string | null
          contractor_id: string | null
          contractor_name: string | null
          contractor_nip: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          due_date: string | null
          elixir_batch_id: string | null
          export_format: string | null
          exported_at: string | null
          gross_amount_pln: number | null
          iban: string | null
          id: string | null
          invoice_id: string | null
          invoice_number: string | null
          notes: string | null
          payment_type: string | null
          recipient_name: string | null
          scheduled_date: string | null
          sent_at: string | null
          status: string | null
          swift_bic: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      cost_user_roles: {
        Row: {
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      staff_orders_edit_view: {
        Row: {
          assigned_to: string | null
          bandera: string | null
          boat_name: string | null
          category: string | null
          hin_ini: string | null
          id: number | null
          new_registration_number: string | null
          notes: string | null
          order_status:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          payment_method: string | null
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          reja_id: string | null
          service_group: string | null
          service_type: string | null
          shipper: string | null
          shipping_status: string | null
          submission_id: string | null
          updated_at: string | null
          usage: string[] | null
          usage_type: string[] | null
        }
        Insert: {
          assigned_to?: string | null
          bandera?: string | null
          boat_name?: string | null
          category?: string | null
          hin_ini?: string | null
          id?: number | null
          new_registration_number?: string | null
          notes?: string | null
          order_status?:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          payment_method?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          reja_id?: string | null
          service_group?: string | null
          service_type?: string | null
          shipper?: string | null
          shipping_status?: string | null
          submission_id?: string | null
          updated_at?: string | null
          usage?: string[] | null
          usage_type?: string[] | null
        }
        Update: {
          assigned_to?: string | null
          bandera?: string | null
          boat_name?: string | null
          category?: string | null
          hin_ini?: string | null
          id?: number | null
          new_registration_number?: string | null
          notes?: string | null
          order_status?:
            | Database["public"]["Enums"]["infinity_status_enum"]
            | null
          payment_method?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          reja_id?: string | null
          service_group?: string | null
          service_type?: string | null
          shipper?: string | null
          shipping_status?: string | null
          submission_id?: string | null
          updated_at?: string | null
          usage?: string[] | null
          usage_type?: string[] | null
        }
        Relationships: []
      }
      team_members_public: {
        Row: {
          active: boolean | null
          address: Json | null
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string | null
          department: string | null
          email: string | null
          emergency_contact: Json | null
          employment_status: string | null
          employment_type: string | null
          first_name: string | null
          full_name: string | null
          hire_date: string | null
          id: string | null
          infinity_user_id: string | null
          last_login_at: string | null
          last_name: string | null
          notes: string | null
          permissions: Json | null
          phone: string | null
          role: string | null
          salary_info: Json | null
          taskade_user_id: string | null
          termination_date: string | null
          updated_at: string | null
          zoho_user_id: string | null
        }
        Insert: {
          active?: boolean | null
          address?: Json | null
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact?: Json | null
          employment_status?: string | null
          employment_type?: string | null
          first_name?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string | null
          infinity_user_id?: string | null
          last_login_at?: string | null
          last_name?: string | null
          notes?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          salary_info?: Json | null
          taskade_user_id?: string | null
          termination_date?: string | null
          updated_at?: string | null
          zoho_user_id?: string | null
        }
        Update: {
          active?: boolean | null
          address?: Json | null
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          emergency_contact?: Json | null
          employment_status?: string | null
          employment_type?: string | null
          first_name?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string | null
          infinity_user_id?: string | null
          last_login_at?: string | null
          last_name?: string | null
          notes?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          salary_info?: Json | null
          taskade_user_id?: string | null
          termination_date?: string | null
          updated_at?: string | null
          zoho_user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      agent_email_exists: { Args: { p_email: string }; Returns: boolean }
      cost_contractor_stats: {
        Args: { p_contractor_id: string }
        Returns: {
          last_invoice_date: string
          overdue_amount_pln: number
          pending_amount_pln: number
          total_gross_pln: number
          total_invoices: number
        }[]
      }
      cost_convert_to_pln: {
        Args: { p_amount: number; p_currency: string; p_date?: string }
        Returns: number
      }
      cost_get_exchange_rate: {
        Args: { p_currency: string; p_date?: string }
        Returns: number
      }
      cost_get_user_role: { Args: never; Returns: string }
      cost_is_admin_or_manager: { Args: never; Returns: boolean }
      cost_is_admin_or_manager_with_access: { Args: never; Returns: boolean }
      current_user_is_team_member: { Args: never; Returns: boolean }
      edge_agent_email_exists: { Args: { p_email: string }; Returns: boolean }
      edge_agents_count: { Args: never; Returns: number }
      edge_get_agent_by_email: {
        Args: { p_email: string }
        Returns: {
          agent_email: string
          agent_first_name: string
          agent_last_name: string
          agent_phone: string
          commission_based: string
          id: number
        }[]
      }
      edge_update_agent_profile: {
        Args: {
          p_agent_id: number
          p_first_name: string
          p_last_name: string
          p_phone: string
        }
        Returns: undefined
      }
      get_agents_directory: {
        Args: never
        Returns: {
          agent_email: string
          agent_first_name: string
          agent_last_name: string
          agent_phone: string
        }[]
      }
      get_app_role: { Args: { p_app_slug: string }; Returns: string }
      get_current_agent_profile: {
        Args: never
        Returns: {
          agent_email: string
          agent_first_name: string
          agent_last_name: string
          agent_phone: string
        }[]
      }
      has_app_access: { Args: { p_app_slug: string }; Returns: boolean }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_app_admin: { Args: never; Returns: boolean }
      map_infinity_status: {
        Args: { raw_status: string }
        Returns: Database["public"]["Enums"]["infinity_status_enum"]
      }
      map_payment_status: {
        Args: { raw_status: string }
        Returns: Database["public"]["Enums"]["payment_status_enum"]
      }
      map_service_group: {
        Args: { raw_service: string }
        Returns: Database["public"]["Enums"]["service_group_enum"]
      }
      migrate_agents_orders_direct_data: { Args: never; Returns: undefined }
      parse_any_date: { Args: { date_text: string }; Returns: string }
      parse_polish_date: { Args: { date_text: string }; Returns: string }
    }
    Enums: {
      additional_service_enum: "mmsi" | "express_registration"
      app_role: "manager" | "admin" | "user" | "viewer"
      b2b_homeport_enum:
        | "Gdynia"
        | "Gdańsk"
        | "Szczecin"
        | "Kołobrzeg"
        | "Świnoujście"
        | "DUMMY_HOMEPORT"
      b2b_hull_material_enum:
        | "GRP"
        | "Aluminum"
        | "Steel"
        | "Wood"
        | "Other"
        | "DUMMY_MATERIAL"
      b2b_main_drive_enum:
        | "sail_drive"
        | "motor_drive"
        | "skijet"
        | "dummy_drive"
      b2b_producer_enum:
        | "BENETEAU"
        | "BAVARIA"
        | "JEANNEAU"
        | "HANSE"
        | "LAGOON"
        | "OTHER"
        | "DUMMY_PRODUCER"
      boat_admin_status_enum:
        | "active"
        | "expired"
        | "pending_renewal"
        | "archived"
      boat_ownership_enum: "owned" | "consignment" | "administrative"
      customer_source_enum: "B2C" | "B2B"
      email_direction_enum: "inbound" | "outbound"
      email_type_enum:
        | "document_sent"
        | "status_inquiry"
        | "follow_up"
        | "invoice"
        | "confirmation"
        | "general"
      infinity_status_enum:
        | "New"
        | "Submitted"
        | "Provisional Ready"
        | "Provisional Sent"
        | "Final"
        | "Shipped"
        | "Closed"
        | "Correction"
        | "SIS"
        | "Archive"
        | "Cancelled"
      invoice_source: "ksef" | "manual" | "api" | "email"
      invoice_status:
        | "new"
        | "describing"
        | "in_workflow"
        | "approved"
        | "paid"
        | "rejected"
      owner_details_enum: "single_person" | "multiple_persons" | "company"
      payment_status_enum:
        | "not invoiced"
        | "pending"
        | "cleared"
        | "windykacja"
        | "partially paid"
        | "refunded"
        | "cancelled"
      processing_status_enum:
        | "imported"
        | "matched"
        | "unmatched"
        | "needs_review"
        | "archived"
      residency_enum: "res_PL" | "res_nonPL"
      service_group_enum:
        | "Registration"
        | "Change"
        | "De-registration"
        | "Odpis"
        | "MMSI"
        | "Translation"
        | "Other"
      service_type_enum:
        | "administrative"
        | "technical"
        | "sales"
        | "registration"
        | "flag_change"
        | "documentation"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      additional_service_enum: ["mmsi", "express_registration"],
      app_role: ["manager", "admin", "user", "viewer"],
      b2b_homeport_enum: [
        "Gdynia",
        "Gdańsk",
        "Szczecin",
        "Kołobrzeg",
        "Świnoujście",
        "DUMMY_HOMEPORT",
      ],
      b2b_hull_material_enum: [
        "GRP",
        "Aluminum",
        "Steel",
        "Wood",
        "Other",
        "DUMMY_MATERIAL",
      ],
      b2b_main_drive_enum: [
        "sail_drive",
        "motor_drive",
        "skijet",
        "dummy_drive",
      ],
      b2b_producer_enum: [
        "BENETEAU",
        "BAVARIA",
        "JEANNEAU",
        "HANSE",
        "LAGOON",
        "OTHER",
        "DUMMY_PRODUCER",
      ],
      boat_admin_status_enum: [
        "active",
        "expired",
        "pending_renewal",
        "archived",
      ],
      boat_ownership_enum: ["owned", "consignment", "administrative"],
      customer_source_enum: ["B2C", "B2B"],
      email_direction_enum: ["inbound", "outbound"],
      email_type_enum: [
        "document_sent",
        "status_inquiry",
        "follow_up",
        "invoice",
        "confirmation",
        "general",
      ],
      infinity_status_enum: [
        "New",
        "Submitted",
        "Provisional Ready",
        "Provisional Sent",
        "Final",
        "Shipped",
        "Closed",
        "Correction",
        "SIS",
        "Archive",
        "Cancelled",
      ],
      invoice_source: ["ksef", "manual", "api", "email"],
      invoice_status: [
        "new",
        "describing",
        "in_workflow",
        "approved",
        "paid",
        "rejected",
      ],
      owner_details_enum: ["single_person", "multiple_persons", "company"],
      payment_status_enum: [
        "not invoiced",
        "pending",
        "cleared",
        "windykacja",
        "partially paid",
        "refunded",
        "cancelled",
      ],
      processing_status_enum: [
        "imported",
        "matched",
        "unmatched",
        "needs_review",
        "archived",
      ],
      residency_enum: ["res_PL", "res_nonPL"],
      service_group_enum: [
        "Registration",
        "Change",
        "De-registration",
        "Odpis",
        "MMSI",
        "Translation",
        "Other",
      ],
      service_type_enum: [
        "administrative",
        "technical",
        "sales",
        "registration",
        "flag_change",
        "documentation",
      ],
    },
  },
} as const
